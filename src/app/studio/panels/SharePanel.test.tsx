// Share panel: project import (FR-9.3) with a summary before it replaces
// anything, the snapshot backgrounds and live preview (FR-10.1), and the loop
// picker the character export carries (FR-10.3). Driven through StudioView so
// the panel is exercised with a real store.
import { describe, expect, it, vi, beforeEach, beforeAll } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
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
  const input = screen.getByLabelText("Importar proyecto");
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

  it("summarizes the incoming file before replacing anything", async () => {
    await upload(projectJsonNamed("Resumen"));
    const dialog = await screen.findByRole("dialog");
    const doc = createDefaultDocument();
    const text = dialog.textContent ?? "";
    // docs/05 §2: N bubbles, M moods, K loops — counted from the file, not
    // from the document currently open.
    expect(text).toContain(String(doc.bubbles.length));
    expect(text).toContain(String(doc.starterKit.moods.length));
    expect(text).toContain(String(doc.starterKit.loops.length));
  });

  it("keeps the document when the summary is dismissed", async () => {
    const user = await upload(projectJsonNamed("Rechazado"));
    await user.click(await screen.findByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByRole("button", { name: "Rechazado" })).toBeNull();
  });

  it("replaces the document once the summary is accepted", async () => {
    const user = await upload(projectJsonNamed("Importado"));
    await user.click(await screen.findByRole("button", { name: "Reemplazar" }));
    // The rail identifies a bubble by its render, so assert on its name.
    expect(
      await screen.findByRole("button", { name: "Importado" }),
    ).toBeTruthy();
  });
});

async function openShare() {
  const user = userEvent.setup();
  render(<StudioView />);
  await user.click(screen.getByRole("tab", { name: "Compartir" }));
  return user;
}

const preview = () => screen.getByTestId("snapshot-preview");

describe("SharePanel snapshot (FR-10.1)", () => {
  it("previews what the snapshot will look like, framed", async () => {
    await openShare();
    expect(preview().innerHTML).toContain("<svg");
  });

  it("offers a radial background with two configurable stops", async () => {
    const user = await openShare();
    // The body's own shading is a radial gradient too, so the assertion names
    // the background's id rather than the element type.
    expect(preview().innerHTML).not.toContain('id="bg-gradient"');
    await user.click(screen.getByRole("radio", { name: "Lineal" }));
    expect(preview().innerHTML).toContain('<linearGradient id="bg-gradient"');
    await user.click(screen.getByRole("radio", { name: "Radial" }));
    expect(preview().innerHTML).toContain('<radialGradient id="bg-gradient"');

    fireEvent.change(screen.getByLabelText("Color inicial"), {
      target: { value: "#123456" },
    });
    expect(preview().innerHTML).toContain("#123456");
    fireEvent.change(screen.getByLabelText("Color final"), {
      target: { value: "#654321" },
    });
    expect(preview().innerHTML).toContain("#654321");
  });

  it("hides the stop pickers for a background that has none", async () => {
    const user = await openShare();
    await user.click(screen.getByRole("radio", { name: "Sin fondo" }));
    expect(screen.queryByLabelText("Color inicial")).toBeNull();
  });
});

describe("SharePanel loop picker (FR-10.3)", () => {
  it("starts with every loop checked", async () => {
    await openShare();
    const boxes = within(
      screen.getByRole("group", { name: "Ciclos incluidos" }),
    ).getAllByRole("checkbox");
    expect(boxes.length).toBeGreaterThan(0);
    expect(boxes.every((b) => (b as HTMLInputElement).checked)).toBe(true);
  });

  it("unchecking a loop leaves the rest checked", async () => {
    const user = await openShare();
    const group = screen.getByRole("group", { name: "Ciclos incluidos" });
    const boxes = within(group).getAllByRole("checkbox");
    const first = boxes[0];
    if (!first) throw new Error("expected a loop checkbox");
    await user.click(first);
    expect((first as HTMLInputElement).checked).toBe(false);
    expect(
      within(group)
        .getAllByRole("checkbox")
        .slice(1)
        .every((b) => (b as HTMLInputElement).checked),
    ).toBe(true);
  });
});
