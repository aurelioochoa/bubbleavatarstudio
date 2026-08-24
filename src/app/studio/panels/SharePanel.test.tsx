// FR-9.3 project import: explicit confirmation on success, readable error
// when the file is invalid. Driven through StudioView so the panel is
// exercised with a real store.
import { describe, expect, it, vi, beforeEach, beforeAll } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StudioView } from "../StudioView";
import { createDefaultDocument } from "../../../domain/document/create";

beforeAll(() => {
  // jsdom File lacks .text(); the app runs in real browsers.
  if (!File.prototype.text) {
    Object.defineProperty(File.prototype, "text", {
      value(this: File) {
        return new Promise<string>((resolve, reject) => {
          const fr = new FileReader();
          fr.onload = () => resolve(String(fr.result));
          fr.onerror = () => reject(fr.error);
          fr.readAsText(this);
        });
      },
    });
  }
});

beforeEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  globalThis.localStorage?.clear();
  vi.stubGlobal("requestAnimationFrame", () => 0);
  vi.stubGlobal("cancelAnimationFrame", () => {});
});

async function upload(file: File) {
  const user = userEvent.setup();
  render(<StudioView />);
  await user.click(screen.getByRole("tab", { name: "Compartir" }));
  const input = screen.getByLabelText("Import");
  await user.upload(input, file);
  return user;
}

function projectJsonNamed(name: string): File {
  const doc = createDefaultDocument();
  const bubble = doc.bubbles[0];
  if (!bubble) throw new Error("fixture missing bubble");
  bubble.name = name;
  return new File([JSON.stringify(doc)], "project.bubble-studio.json", {
    type: "application/json",
  });
}

describe("SharePanel project import (FR-9.3)", () => {
  it("shows a readable error alert for malformed JSON", async () => {
    await upload(
      new File(["{not json"], "bad.json", { type: "application/json" }),
    );
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Archivo de proyecto no válido");
  });

  it("shows a readable error alert for an invalid document", async () => {
    await upload(new File(["{}"], "empty.json", { type: "application/json" }));
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Archivo de proyecto no válido");
  });

  it("keeps the document when confirmation is rejected", async () => {
    vi.stubGlobal("confirm", vi.fn(() => false));
    await upload(projectJsonNamed("Rechazado"));
    await screen.findByText("Photo Mode");
    expect(screen.queryByText("Rechazado")).toBeNull();
  });

  it("replaces the document after confirmation", async () => {
    vi.stubGlobal("confirm", vi.fn(() => true));
    await upload(projectJsonNamed("Importado"));
    // The rail identifies a bubble by its render, so assert on its name.
    expect(
      await screen.findByRole("button", { name: "Importado" }),
    ).toBeTruthy();
  });
});
