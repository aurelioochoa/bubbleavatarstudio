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

/**
 * The export frame is portalled onto the stage column, so a case that asserts
 * it has to look there rather than in the panel — which is the point of it.
 */
async function openShareWithStage() {
  const user = await openShare();
  const host = screen.getByLabelText("bubble stage").closest("main");
  if (!host) throw new Error("expected the stage column");
  return { user, host };
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

describe("SharePanel loop picker (FR-10.3, FR-10.6)", () => {
  const chips = () =>
    within(
      screen.getByRole("group", { name: "Ciclos incluidos" }),
    ).getAllByRole("switch");

  it("starts with every loop travelling", async () => {
    await openShare();
    expect(chips().length).toBeGreaterThan(0);
    expect(
      chips().every((c) => c.getAttribute("aria-checked") === "true"),
    ).toBe(true);
  });

  it("dropping one loop leaves the rest travelling", async () => {
    const user = await openShare();
    const first = chips()[0];
    if (!first) throw new Error("expected a loop chip");
    await user.click(first);
    expect(chips()[0]?.getAttribute("aria-checked")).toBe("false");
    expect(
      chips()
        .slice(1)
        .every((c) => c.getAttribute("aria-checked") === "true"),
    ).toBe(true);
  });

  it("clears and restores a whole group in one press", async () => {
    // Twenty checkboxes is twenty presses to answer "just the reactions".
    const user = await openShare();
    const on = () =>
      chips().filter((c) => c.getAttribute("aria-checked") === "true").length;
    const before = on();
    await user.click(screen.getAllByRole("button", { name: "Ninguno" })[0]);
    expect(on()).toBeLessThan(before);
    await user.click(screen.getAllByRole("button", { name: "Todos" })[0]);
    expect(on()).toBe(before);
  });

  it("says what the package will weigh before it is built (FR-10.6)", async () => {
    await openShare();
    const line = screen.getByTestId("export-weight").textContent ?? "";
    expect(line).toMatch(/\d+ ciclos/);
    expect(line).toMatch(/aprox\. \d+ KB/);
  });

  it("gets lighter as loops are dropped", async () => {
    const user = await openShare();
    const kb = () =>
      Number(
        /aprox\. (\d+) KB/.exec(
          screen.getByTestId("export-weight").textContent ?? "",
        )?.[1] ?? "0",
      );
    const before = kb();
    await user.click(screen.getAllByRole("button", { name: "Ninguno" })[0]);
    expect(kb()).toBeLessThan(before);
  });

  it("counts the moods the prune drops (FR-10.6)", async () => {
    const user = await openShare();
    await user.click(screen.getAllByRole("button", { name: "Ninguno" })[0]);
    expect(screen.getByTestId("export-weight").textContent).toContain(
      "ánimos podados",
    );
  });
});

describe("SharePanel export frame (FR-10.6)", () => {
  it("draws the frame on the stage, not in the panel", async () => {
    // The framing decision is made by looking at the character; a crop
    // described only as a number in a panel has to be imagined over it.
    const { host } = await openShareWithStage();
    expect(within(host).getByTestId("export-frame")).toBeTruthy();
  });

  it("names the size and background the snapshot will have", async () => {
    const { host, user } = await openShareWithStage();
    expect(within(host).getByTestId("export-frame").textContent).toContain(
      "1024 × 1024",
    );
    await user.click(screen.getByRole("radio", { name: "512" }));
    expect(within(host).getByTestId("export-frame").textContent).toContain(
      "512 × 512",
    );
    await user.click(screen.getByRole("radio", { name: "Sólido" }));
    expect(within(host).getByTestId("export-frame").textContent).toContain(
      "Sólido",
    );
  });

  it("says which stage chrome the export leaves behind", async () => {
    const { host } = await openShareWithStage();
    expect(
      within(host).getByText("La guía y la sombra de contacto no se exportan"),
    ).toBeTruthy();
  });
});
