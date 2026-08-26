// FR-9 studio shell smoke test (jsdom). rAF is stubbed; the engine is
// exercised in unit tests, here we verify the UI tree and interactions.
import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StudioView } from "./StudioView";
import {
  createDefaultDocument,
  starterKit,
} from "../../domain/document/create";
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
    const raw = globalThis.localStorage.getItem("bubble-studio.document.v1");
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw as string).bubbles).toHaveLength(2);
  });

  it("asks for confirmation before deleting a bubble (FR-1.5)", async () => {
    const user = userEvent.setup();
    render(<StudioView />);
    await user.click(screen.getByRole("button", { name: "Nueva burbuja" }));

    vi.stubGlobal(
      "confirm",
      vi.fn(() => false),
    );
    await openRailMenu(user, 1);
    await user.click(screen.getByRole("menuitem", { name: "Eliminar" }));
    expect(screen.getAllByRole("button", { name: "Bubble" })).toHaveLength(2);

    vi.stubGlobal(
      "confirm",
      vi.fn(() => true),
    );
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

  it("Moods tab lists starter kit moods and opens the editor over the stage", async () => {
    const user = userEvent.setup();
    render(<StudioView />);
    await user.click(screen.getByRole("tab", { name: "Ánimos" }));
    expect(screen.getByRole("button", { name: "happy" })).toBeTruthy();

    // The editor is a modal over the inspector (docs/05 §2); the stage stays
    // rendered behind it, which is what makes the live preview useful.
    await user.dblClick(screen.getByRole("button", { name: "happy" }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByLabelText("bubble stage")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("Loops tab lists the starter loops", async () => {
    const user = userEvent.setup();
    render(<StudioView />);
    await user.click(screen.getByRole("tab", { name: "Ciclos" }));
    // A row states its name, its shape and how long it runs, so it is named
    // for the row it is rather than for the loop alone.
    expect(screen.getByRole("button", { name: /^idle/ })).toBeTruthy();
  });

  it("transport sits on the track, reachable from every tab (FR-6.6)", async () => {
    const user = userEvent.setup();
    render(<StudioView />);
    // Look is the default tab and the track is already there, below all three
    // columns rather than over the stage.
    const track = screen.getByRole("region", { name: "Pista" });
    expect(
      within(track).getByRole("button", { name: "Reproducir" }),
    ).toBeTruthy();
    await user.click(screen.getByRole("tab", { name: "Compartir" }));
    // Share folds the strip away; the transport is still one gesture off.
    expect(
      within(track).getByRole("button", { name: "Reproducir" }),
    ).toBeTruthy();
    expect(within(track).queryByTestId("step-chip")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Ampliar secuencia" }));
    expect(within(track).getAllByTestId("step-chip").length).toBeGreaterThan(0);
  });

  it("a scrub on a stopped stage pauses it where it was pressed (FR-6.7)", () => {
    render(<StudioView />);
    expect(screen.getByTestId("stage-status").textContent).toContain(
      "En reposo",
    );

    const strip = screen.getByTestId("track-strip");
    strip.getBoundingClientRect = () =>
      ({
        left: 0,
        right: 400,
        width: 400,
        top: 0,
        bottom: 60,
        height: 60,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect;
    const press = new Event("pointerdown", { bubbles: true, cancelable: true });
    Object.assign(press, { pointerId: 1, clientX: 200 });
    fireEvent(strip, press);

    // Stopped rewinds on every engine update and shows the resting face, so a
    // scrub that left it stopped would do nothing the user can see.
    expect(screen.getByTestId("stage-status").textContent).toContain(
      "En pausa",
    );
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

  it("refuses to delete a referenced mood before it is attempted (FR-4.8)", async () => {
    const user = userEvent.setup();
    render(<StudioView />);
    await user.click(screen.getByRole("tab", { name: "Ánimos" }));
    // Every starter mood is in at least one starter loop, so this used to be
    // the shortest path to an E_REF alert: confirm the delete, watch the
    // reducer refuse it, read the refusal. The control now says so itself.
    // FR-5.6 is unchanged and still the backstop — store.test.ts drives the
    // reducer straight and asserts the E_REF it returns.
    const bar = screen.getByTestId("mood-selection");
    const remove = within(bar).getByRole("button", {
      name: "No se puede borrar mientras un ciclo lo use",
    });
    expect(remove.hasAttribute("disabled")).toBe(true);
    expect(within(bar).getByText("Usado en 6 ciclos")).toBeTruthy();
  });

  it("asks for confirmation before deleting a loop", async () => {
    const user = userEvent.setup();
    render(<StudioView />);
    await user.click(screen.getByRole("tab", { name: "Ciclos" }));
    const row = () => screen.queryByRole("button", { name: /^idle/ });
    expect(row()).toBeTruthy();
    // Delete lives in the loop's own card, which the panel keeps collapsed:
    // the list is what the column is for.
    await user.click(screen.getByRole("button", { name: "Ciclo" }));

    vi.stubGlobal(
      "confirm",
      vi.fn(() => false),
    );
    await user.click(screen.getByRole("button", { name: "Eliminar" }));
    expect(row()).toBeTruthy();

    vi.stubGlobal(
      "confirm",
      vi.fn(() => true),
    );
    await user.click(screen.getByRole("button", { name: "Eliminar" }));
    expect(row()).toBeNull();
  });

  it("reorders the rail by dragging one bubble onto another (FR-1.4)", async () => {
    // Two distinctly named bubbles, or "the order changed" is unobservable.
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(full));
    render(<StudioView />);

    // The fixture carries locale "en", so the rail announces itself in English.
    await screen.findByRole("button", { name: "Alpha" });
    const rail = screen.getByRole("navigation", { name: "Bubbles" });
    const names = () =>
      within(rail)
        .getAllByRole("listitem")
        .map((li) =>
          within(li).getAllByRole("button")[0]?.getAttribute("aria-label"),
        );
    expect(names()).toEqual(["Alpha", "Beta"]);

    const rows = within(rail).getAllByRole("listitem");
    const [first, second] = rows;
    if (!first || !second) throw new Error("rail should hold two bubbles");
    const data = new Map<string, string>();
    const dataTransfer = {
      setData: (k: string, v: string) => data.set(k, v),
      getData: (k: string) => data.get(k) ?? "",
      effectAllowed: "",
      dropEffect: "",
    };
    fireEvent.dragStart(first, { dataTransfer });
    fireEvent.dragOver(second, { dataTransfer });
    fireEvent.drop(second, { dataTransfer });

    expect(names()).toEqual(["Beta", "Alpha"]);
  });

  it("asks for confirmation before deleting a mood", async () => {
    const user = userEvent.setup();
    render(<StudioView />);
    await user.click(screen.getByRole("tab", { name: "Ánimos" }));
    // Every starter mood is referenced by a starter loop, so deleting one is
    // refused outright (FR-4.8/FR-5.6). Add a fresh mood so this test measures
    // the confirmation gate and nothing else.
    await user.click(screen.getByRole("button", { name: "+ Nuevo ánimo" }));
    // MoodsPanel names a new mood `mood ${kit.moods.length + 1}`; derive it
    // rather than re-hard-coding a number the starter library sets.
    const added = `mood ${String(starterKit().moods.length + 1)}`;
    await user.click(screen.getByRole("button", { name: added }));

    const remove = async () => {
      await user.click(
        screen.getByRole("button", { name: `Eliminar · ${added}` }),
      );
    };

    vi.stubGlobal(
      "confirm",
      vi.fn(() => false),
    );
    await remove();
    expect(screen.getByRole("button", { name: added })).toBeTruthy();

    vi.stubGlobal(
      "confirm",
      vi.fn(() => true),
    );
    await remove();
    expect(screen.queryByRole("button", { name: added })).toBeNull();
  });
});

describe("StudioView header (FR-9.6, FR-9.7)", () => {
  it("says the document is saved once the autosave lands", async () => {
    render(<StudioView />);
    // The first render pushes the restored document, so it starts in flight.
    expect(screen.getByTestId("save-state").textContent).toContain("Guardando");
    await waitFor(() => {
      expect(screen.getByTestId("save-state").textContent).toContain(
        "Guardado",
      );
    });
  });

  it("says so when storage refuses the write, rather than looking saved", async () => {
    // Autosave is silent by design (FR-9.2); silence and failure look the
    // same, which is the whole reason FR-9.6 exists.
    vi.stubGlobal("localStorage", {
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
      removeItem: () => {},
      clear: () => {},
    });
    render(<StudioView />);
    await waitFor(() => {
      expect(screen.getByTestId("save-state").textContent).toContain(
        "No se pudo guardar",
      );
    });
    vi.unstubAllGlobals();
  });

  it("writes down what the studio answers to (FR-9.7)", async () => {
    const user = userEvent.setup();
    render(<StudioView />);
    await user.click(screen.getByRole("button", { name: /Atajos/ }));
    const sheet = screen.getByRole("dialog", { name: "Atajos" });
    expect(within(sheet).getByText(/gira la cabeza/)).toBeTruthy();
    expect(within(sheet).getByText(/deshace el giro/)).toBeTruthy();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Atajos" })).toBeNull();
  });
});
