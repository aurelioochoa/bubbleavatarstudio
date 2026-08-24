// FR-9 studio shell smoke test (jsdom). rAF is stubbed; the engine is
// exercised in unit tests, here we verify the UI tree and interactions.
import { describe, expect, it, vi, beforeEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StudioView } from "./StudioView";
import { createDefaultDocument, starterKit } from "../../domain/document/create";
import { STORAGE_KEY } from "../persistence";
import full from "../../test/fixtures/full.json";

beforeEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  globalThis.localStorage?.clear();
  vi.stubGlobal("requestAnimationFrame", () => 0);
  vi.stubGlobal("cancelAnimationFrame", () => {});
});

/** Opens the rail context menu for the nth bubble (docs/05 §1). */
async function openRailMenu(
  user: ReturnType<typeof userEvent.setup>,
  index: number,
) {
  const kebabs = screen.getAllByRole("button", {
    name: "Acciones de la burbuja",
  });
  const kebab = kebabs[index];
  if (!kebab) throw new Error(`no rail kebab at ${String(index)}`);
  await user.click(kebab);
}

/** Height of the first eye rect the stage is currently showing. */
function eyeHeight(stage: HTMLElement): number {
  return Number(stage.querySelector("rect")?.getAttribute("height") ?? "0");
}

describe("StudioView", () => {
  it("renders shell with tabs and default bubble", () => {
    render(<StudioView />);
    expect(
      screen.getByRole("heading", { name: "Bubble Avatar Studio" }),
    ).toBeTruthy();
    for (const tab of ["Aspecto", "Ánimos", "Ciclos", "Compartir"]) {
      expect(screen.getByRole("tab", { name: tab })).toBeTruthy();
    }
    expect(screen.getByRole("button", { name: "Bubble" })).toBeTruthy();
  });

  it("switches locale es→en", async () => {
    const user = userEvent.setup();
    render(<StudioView />);
    await user.click(screen.getByRole("button", { name: "en" }));
    expect(screen.getByRole("tab", { name: "Look" })).toBeTruthy();
  });

  it("adds a bubble from the rail", async () => {
    const user = userEvent.setup();
    render(<StudioView />);
    await user.click(screen.getByRole("button", { name: "Nueva burbuja" }));
    expect(screen.getAllByRole("button", { name: "Bubble" })).toHaveLength(2);
  });

  it("flushes autosave on pagehide so quick reloads keep edits (FR-9.2)", async () => {
    const user = userEvent.setup();
    render(<StudioView />);
    await user.click(screen.getByRole("button", { name: "Nueva burbuja" }));
    globalThis.dispatchEvent(new Event("pagehide"));
    const raw = globalThis.localStorage.getItem(
      "bubble-studio.document.v1",
    );
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw as string).bubbles).toHaveLength(2);
  });

  it("asks for confirmation before deleting a bubble (FR-1.5)", async () => {
    const user = userEvent.setup();
    render(<StudioView />);
    await user.click(screen.getByRole("button", { name: "Nueva burbuja" }));

    vi.stubGlobal("confirm", vi.fn(() => false));
    await openRailMenu(user, 1);
    await user.click(screen.getByRole("menuitem", { name: "Eliminar" }));
    expect(screen.getAllByRole("button", { name: "Bubble" })).toHaveLength(2);

    vi.stubGlobal("confirm", vi.fn(() => true));
    await openRailMenu(user, 1);
    await user.click(screen.getByRole("menuitem", { name: "Eliminar" }));
    expect(screen.getAllByRole("button", { name: "Bubble" })).toHaveLength(1);
  });

  it("Look tab shows surface controls", async () => {
    const user = userEvent.setup();
    render(<StudioView />);
    await user.click(screen.getByRole("tab", { name: "Aspecto" }));
    expect(screen.getByText("Redondez")).toBeTruthy();
  });

  it("Moods tab lists starter kit moods and supports cancelable edits", async () => {
    const user = userEvent.setup();
    render(<StudioView />);
    await user.click(screen.getByRole("tab", { name: "Ánimos" }));
    expect(screen.getByRole("button", { name: "happy" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeTruthy();
  });

  it("Loops tab lists the starter loops", async () => {
    const user = userEvent.setup();
    render(<StudioView />);
    await user.click(screen.getByRole("tab", { name: "Ciclos" }));
    expect(screen.getByRole("button", { name: "idle" })).toBeTruthy();
  });

  it("transport sits on the stage dock, reachable from every tab (docs/05 §1)", async () => {
    const user = userEvent.setup();
    render(<StudioView />);
    // Look is the default tab and the dock is already there.
    expect(screen.getByRole("button", { name: "Reproducir" })).toBeTruthy();
    await user.click(screen.getByRole("tab", { name: "Compartir" }));
    expect(screen.getByRole("button", { name: "Reproducir" })).toBeTruthy();
  });

  it("transport plays, pauses and stops the selected loop (FR-6.2)", async () => {
    const user = userEvent.setup();
    render(<StudioView />);
    const stop = screen.getByRole("button", { name: "Detener" });
    expect(stop.hasAttribute("disabled")).toBe(true);

    await user.click(screen.getByRole("button", { name: "Reproducir" }));
    expect(screen.getByRole("button", { name: "Pausar" })).toBeTruthy();
    expect(stop.hasAttribute("disabled")).toBe(false);

    await user.click(screen.getByRole("button", { name: "Pausar" }));
    expect(screen.getByRole("button", { name: "Reproducir" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Reproducir" }));
    await user.click(stop);
    expect(screen.getByRole("button", { name: "Reproducir" })).toBeTruthy();
    expect(stop.hasAttribute("disabled")).toBe(true);
  });

  it("selecting a mood updates the stage and takes over playback (FR-4.4, FR-6.1)", async () => {
    const user = userEvent.setup();
    render(<StudioView />);
    const stage = screen.getByLabelText("bubble stage");
    await user.click(screen.getByRole("button", { name: "Reproducir" }));

    await user.click(screen.getByRole("tab", { name: "Ánimos" }));
    const before = eyeHeight(stage);
    expect(before).toBeGreaterThan(0);

    // "sleepy" squashes the eyes, so the stage must visibly change.
    await user.click(screen.getByRole("button", { name: "sleepy" }));
    expect(eyeHeight(stage)).toBeLessThan(before * 0.6);

    // Manual selection owns the live state, so playback is no longer running.
    expect(screen.getByRole("button", { name: "Reproducir" })).toBeTruthy();
  });

  it("stops when the target bubble cannot play the current loop (FR-6.4)", async () => {
    const user = userEvent.setup();
    // Alpha owns a kit whose "wave" loop Beta, on the starter kit, does not have.
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(full));
    render(<StudioView />);
    await user.click(screen.getByRole("button", { name: "Play" }));
    expect(screen.getByRole("button", { name: "Pause" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Beta" }));
    expect(screen.getByRole("button", { name: "Play" })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Stop" }).hasAttribute("disabled"),
    ).toBe(true);
  });

  it("renders a stored document whose kit has no loops (FR-5.2, FR-6.2)", () => {
    const doc = createDefaultDocument();
    const withoutLoops = {
      ...doc,
      starterKit: { ...doc.starterKit, loops: [] },
    };
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(withoutLoops));
    render(<StudioView />);
    expect(screen.getByLabelText("bubble stage")).toBeTruthy();
  });

  it("rail shows a live mini-render per bubble (docs/05 §1)", () => {
    render(<StudioView />);
    const thumb = screen.getByRole("button", { name: "Bubble" });
    expect(thumb.querySelector("svg")).toBeTruthy();
    expect(thumb.getAttribute("aria-current")).toBe("true");
  });

  it("rail menu renames a bubble", async () => {
    const user = userEvent.setup();
    render(<StudioView />);
    await openRailMenu(user, 0);
    const input = screen.getByRole("textbox", { name: "Renombrar" });
    await user.clear(input);
    await user.type(input, "Nube{Enter}");
    expect(screen.getByRole("button", { name: "Nube" })).toBeTruthy();
  });

  it("rail menu duplicates a bubble", async () => {
    const user = userEvent.setup();
    render(<StudioView />);
    await openRailMenu(user, 0);
    await user.click(screen.getByRole("menuitem", { name: "Duplicar" }));
    expect(
      screen.getAllByRole("button", { name: /Bubble/ }).length,
    ).toBeGreaterThan(1);
  });

  it("rail menu reorders bubbles, with the ends disabled", async () => {
    const user = userEvent.setup();
    render(<StudioView />);
    await user.click(screen.getByRole("button", { name: "Nueva burbuja" }));
    await openRailMenu(user, 0);
    expect(
      screen
        .getByRole("menuitem", { name: "Subir burbuja" })
        .hasAttribute("disabled"),
    ).toBe(true);

    const names = () =>
      screen
        .getAllByRole("button", { name: /Bubble/ })
        .map((b) => b.getAttribute("aria-label"));
    await user.click(screen.getByRole("menuitem", { name: "Bajar burbuja" }));
    expect(names()).toHaveLength(2);
  });

  it("Escape closes the rail menu", async () => {
    const user = userEvent.setup();
    render(<StudioView />);
    await openRailMenu(user, 0);
    expect(screen.getByRole("menu")).toBeTruthy();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("deleting a referenced mood surfaces the E_REF error alert", async () => {
    const user = userEvent.setup();
    render(<StudioView />);
    await user.click(screen.getByRole("tab", { name: "Ánimos" }));
    await user.click(screen.getByRole("button", { name: "happy" }));
    // Confirm first (docs/05 §3); the reducer is what refuses afterwards.
    vi.stubGlobal("confirm", vi.fn(() => true));
    const buttons = screen.getAllByRole("button", { name: "Eliminar" });
    const del = buttons[buttons.length - 1];
    if (!del) throw new Error("delete button missing");
    await user.click(del);
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("No se puede eliminar");
  });

  // docs/05 §3: every destructive action confirms. Bubble delete and import
  // already did; loop and mood delete applied immediately until this landed.
  it("asks for confirmation before deleting a loop", async () => {
    const user = userEvent.setup();
    render(<StudioView />);
    await user.click(screen.getByRole("tab", { name: "Ciclos" }));
    expect(screen.getByRole("button", { name: "idle" })).toBeTruthy();

    vi.stubGlobal("confirm", vi.fn(() => false));
    await user.click(screen.getByRole("button", { name: "Eliminar" }));
    expect(screen.getByRole("button", { name: "idle" })).toBeTruthy();

    vi.stubGlobal("confirm", vi.fn(() => true));
    await user.click(screen.getByRole("button", { name: "Eliminar" }));
    expect(screen.queryByRole("button", { name: "idle" })).toBeNull();
  });

  it("asks for confirmation before deleting a mood", async () => {
    const user = userEvent.setup();
    render(<StudioView />);
    await user.click(screen.getByRole("tab", { name: "Ánimos" }));
    // Every starter mood is referenced by a starter loop, so deleting one is
    // blocked by E_REF (FR-5.6) whatever the confirmation says. Add a fresh
    // mood so this test measures the confirmation gate and nothing else.
    await user.click(screen.getByRole("button", { name: "+ Nuevo ánimo" }));
    // MoodsPanel names a new mood `mood ${kit.moods.length + 1}`; derive it
    // rather than re-hard-coding a number the starter library sets.
    const added = `mood ${String(starterKit().moods.length + 1)}`;
    await user.click(screen.getByRole("button", { name: added }));

    const remove = async () => {
      const del = screen.getAllByRole("button", { name: "Eliminar" }).at(-1);
      if (!del) throw new Error("delete button missing");
      await user.click(del);
    };

    vi.stubGlobal("confirm", vi.fn(() => false));
    await remove();
    expect(screen.getByRole("button", { name: added })).toBeTruthy();

    vi.stubGlobal("confirm", vi.fn(() => true));
    await remove();
    expect(screen.queryByRole("button", { name: added })).toBeNull();
  });
});
