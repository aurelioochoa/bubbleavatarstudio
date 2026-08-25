// Moods panel: the card grid, its per-card menu, and the modal editor
// (FR-4.1 all seven deltas per eye, FR-4.2 CRUD and reorder, FR-4.3 the
// optional colour override on body and eyes, FR-4.4 cancelable edits).
//
// dispatch is a spy and the panel's fields are controlled by props, so each
// case commits a whole value in one event rather than typing into a field
// that never updates.
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MoodsPanel } from "./MoodsPanel";
import { createDefaultDocument } from "../../../domain/document/create";
import { effectiveKit } from "../../../domain/document/mutate";
import { translator } from "../../i18n";

beforeEach(cleanup);
afterEach(() => {
  vi.unstubAllGlobals();
});

function setup() {
  const doc = createDefaultDocument();
  const bubble = doc.bubbles[0];
  if (!bubble) throw new Error("fixture missing bubble");
  const kit = effectiveKit(bubble, doc);
  const dispatch = vi.fn();
  const onPreview = vi.fn();
  render(
    <MoodsPanel
      kit={kit}
      bubble={bubble}
      dispatch={dispatch}
      t={translator("es")}
      onPreview={onPreview}
    />,
  );
  const first = kit.moods[0];
  const second = kit.moods[1];
  if (!first || !second) throw new Error("fixture needs two moods");
  return { kit, dispatch, onPreview, first, second };
}

const openMenu = async (user: ReturnType<typeof userEvent.setup>, name: string) => {
  await user.click(screen.getByRole("button", { name: `Acciones · ${name}` }));
  return screen.getByRole("menu", { name });
};

const openEditor = async (
  user: ReturnType<typeof userEvent.setup>,
  name: string,
) => {
  const menu = await openMenu(user, name);
  await user.click(within(menu).getByRole("menuitem", { name: "Editar" }));
  return screen.getByRole("dialog");
};

describe("mood cards (FR-4.5, docs/05 §2)", () => {
  it("previews a mood on the stage when its card is clicked (FR-4.4)", async () => {
    const user = userEvent.setup();
    const { onPreview, second } = setup();
    await user.click(screen.getByRole("button", { name: second.name }));
    expect(onPreview).toHaveBeenCalledWith({
      left: second.left,
      right: second.right,
      colorOverride: second.colorOverride,
    });
  });
});

describe("mood menu (FR-4.2)", () => {
  it("duplicates from the menu", async () => {
    const user = userEvent.setup();
    const { dispatch, first } = setup();
    const menu = await openMenu(user, first.name);
    await user.click(within(menu).getByRole("menuitem", { name: "Duplicar" }));
    expect(dispatch).toHaveBeenCalledWith({
      type: "mood/duplicate",
      moodId: first.id,
    });
  });

  it("reorders by swapping with the neighbour, never by index alone", async () => {
    const user = userEvent.setup();
    const { dispatch, kit, first, second } = setup();
    const menu = await openMenu(user, first.name);
    await user.click(within(menu).getByRole("menuitem", { name: "Bajar" }));
    const ids = kit.moods.map((m) => m.id);
    expect(dispatch).toHaveBeenCalledWith({
      type: "mood/reorder",
      ids: [second.id, first.id, ...ids.slice(2)],
    });
  });

  it("cannot move the first mood up", async () => {
    const user = userEvent.setup();
    const { first } = setup();
    const menu = await openMenu(user, first.name);
    expect(
      within(menu).getByRole("menuitem", { name: "Subir" }).hasAttribute("disabled"),
    ).toBe(true);
  });

  it("confirms before deleting, and does nothing when refused (docs/05 §3)", async () => {
    const user = userEvent.setup();
    const { dispatch, first } = setup();
    vi.stubGlobal("confirm", vi.fn(() => false));
    const menu = await openMenu(user, first.name);
    await user.click(within(menu).getByRole("menuitem", { name: "Eliminar" }));
    expect(dispatch).not.toHaveBeenCalled();

    vi.stubGlobal("confirm", vi.fn(() => true));
    const again = await openMenu(user, first.name);
    await user.click(within(again).getByRole("menuitem", { name: "Eliminar" }));
    expect(dispatch).toHaveBeenCalledWith({
      type: "mood/remove",
      moodId: first.id,
    });
  });
});

describe("mood editor (FR-4.1, FR-4.3, FR-4.4)", () => {
  it("exposes all seven deltas for each eye", async () => {
    const user = userEvent.setup();
    const { first } = setup();
    await openEditor(user, first.name);
    for (const side of ["Ojo izquierdo", "Ojo derecho"]) {
      for (const field of [
        "Rotación X",
        "Rotación Y",
        "Rotación Z",
        "Escala X",
        "Escala Y",
        "Desplazamiento X",
        "Desplazamiento Y",
      ]) {
        expect(screen.getByLabelText(`${side} · ${field}`)).toBeTruthy();
      }
    }
  });

  it("previews every draft change without committing it", async () => {
    const user = userEvent.setup();
    const { dispatch, onPreview, first } = setup();
    await openEditor(user, first.name);
    onPreview.mockClear();
    fireEvent.change(screen.getByLabelText("Ojo izquierdo · Rotación X"), {
      target: { value: "12" },
    });
    expect(onPreview).toHaveBeenCalledWith(
      expect.objectContaining({
        left: expect.objectContaining({ rotationXDeg: 12 }) as unknown,
      }),
    );
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("mirrors the left eye onto the right", async () => {
    const user = userEvent.setup();
    const { dispatch, first } = setup();
    await openEditor(user, first.name);
    fireEvent.change(screen.getByLabelText("Ojo izquierdo · Rotación Z"), {
      target: { value: "18" },
    });
    fireEvent.change(screen.getByLabelText("Ojo izquierdo · Rotación X"), {
      target: { value: "9" },
    });
    fireEvent.change(screen.getByLabelText("Ojo izquierdo · Desplazamiento X"), {
      target: { value: "7" },
    });
    await user.click(
      screen.getByRole("button", { name: "Reflejar izquierdo → derecho" }),
    );
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    const call = dispatch.mock.calls.at(-1)?.[0] as {
      patch: {
        left: { rotationZDeg: number };
        right: { rotationZDeg: number; rotationXDeg: number; offsetX: number };
      };
    };
    // Roll and yaw are handed, so mirroring flips their sign the way FR-3.3
    // mirrors the resting face; pitch and the scales are not.
    expect(call.patch.left.rotationZDeg).toBe(18);
    expect(call.patch.right.rotationZDeg).toBe(-18);
    expect(call.patch.right.offsetX).toBe(-7);
    expect(call.patch.right.rotationXDeg).toBe(9);
  });

  it("saves the name and both eyes in one committed update", async () => {
    const user = userEvent.setup();
    const { dispatch, first } = setup();
    await openEditor(user, first.name);
    fireEvent.change(screen.getByLabelText("Nombre"), {
      target: { value: "asombro" },
    });
    fireEvent.change(screen.getByLabelText("Ojo derecho · Escala Y"), {
      target: { value: "1.5" },
    });
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    expect(dispatch).toHaveBeenCalledTimes(1);
    const call = dispatch.mock.calls[0]?.[0] as {
      type: string;
      moodId: string;
      patch: { name: string; right: { scaleY: number } };
    };
    expect(call.type).toBe("mood/update");
    expect(call.moodId).toBe(first.id);
    expect(call.patch.name).toBe("asombro");
    expect(call.patch.right.scaleY).toBe(1.5);
  });

  it("cancelling discards the draft and puts the saved mood back on stage", async () => {
    const user = userEvent.setup();
    const { dispatch, onPreview, first } = setup();
    await openEditor(user, first.name);
    fireEvent.change(screen.getByLabelText("Ojo izquierdo · Rotación X"), {
      target: { value: "25" },
    });
    onPreview.mockClear();
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(dispatch).not.toHaveBeenCalled();
    expect(onPreview).toHaveBeenLastCalledWith({
      left: first.left,
      right: first.right,
      colorOverride: first.colorOverride,
    });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("overrides body and eye colour independently, and clears both (FR-4.3)", async () => {
    const user = userEvent.setup();
    const { dispatch, first } = setup();
    await openEditor(user, first.name);
    await user.click(screen.getByLabelText("Cuerpo"));
    fireEvent.change(screen.getByLabelText("Color del cuerpo"), {
      target: { value: "#112233" },
    });
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    const call = dispatch.mock.calls.at(-1)?.[0] as {
      patch: { colorOverride: { body?: string; eyes?: string } | null };
    };
    expect(call.patch.colorOverride).toEqual({ body: "#112233" });

    cleanup();
    const second = setup();
    await openEditor(user, second.first.name);
    await user.click(screen.getByLabelText("Ojos"));
    await user.click(screen.getByRole("button", { name: "Quitar color" }));
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    const cleared = second.dispatch.mock.calls.at(-1)?.[0] as {
      patch: { colorOverride: unknown };
    };
    expect(cleared.patch.colorOverride).toBeNull();
  });
});
/** jsdom's drag events carry no dataTransfer; supply the parts the hook reads. */
function dragCard(from: Element, to: Element) {
  const data = new Map<string, string>();
  const dataTransfer = {
    setData: (k: string, v: string) => data.set(k, v),
    getData: (k: string) => data.get(k) ?? "",
    effectAllowed: "",
    dropEffect: "",
  };
  fireEvent.dragStart(from, { dataTransfer });
  fireEvent.dragOver(to, { dataTransfer });
  fireEvent.drop(to, { dataTransfer });
}

const rowOf = (el: Element): Element => {
  const li = el.closest("li");
  if (!li) throw new Error("expected the control to sit in a list row");
  return li;
};

describe("mood reorder by drag (docs/05 §2)", () => {
  it("drops a card into the target's place and commits the new order", () => {
    const { dispatch, kit, first } = setup();
    const third = kit.moods[2];
    if (!third) throw new Error("fixture needs three moods");
    dragCard(
      rowOf(screen.getByRole("button", { name: first.name })),
      rowOf(screen.getByRole("button", { name: third.name })),
    );
    const ids = kit.moods.map((m) => m.id);
    expect(dispatch).toHaveBeenCalledWith({
      type: "mood/reorder",
      ids: [ids[1], ids[2], ids[0], ...ids.slice(3)],
    });
  });

  it("leaves the order alone when a card is dropped on itself", () => {
    const { dispatch, first } = setup();
    const card = rowOf(screen.getByRole("button", { name: first.name }));
    dragCard(card, card);
    expect(dispatch).not.toHaveBeenCalled();
  });
});

describe("the starter-library row (FR-4.7, FR-5.7)", () => {
  /** A kit saved before the library grew, so it is short of both. */
  function setupStale() {
    const doc = createDefaultDocument();
    const bubble = doc.bubbles[0];
    if (!bubble) throw new Error("fixture missing bubble");
    const full = effectiveKit(bubble, doc);
    const kit = { moods: full.moods.slice(0, 2), loops: [] };
    const dispatch = vi.fn();
    render(
      <MoodsPanel
        kit={kit}
        bubble={bubble}
        dispatch={dispatch}
        t={translator("es")}
        onPreview={vi.fn()}
      />,
    );
    return { dispatch, full };
  }

  const topUpButton = () =>
    screen.queryByRole("button", { name: "Añadir lo que falta" });

  it("stays hidden while the kit already holds the whole library", () => {
    setup();
    expect(topUpButton()).toBeNull();
  });

  it("appears with what is missing when the kit is short", () => {
    const { full } = setupStale();
    expect(topUpButton()).not.toBeNull();
    expect(
      screen.getByText(
        `+${String(full.moods.length - 2)} Ánimos · +${String(full.loops.length)} Ciclos`,
      ),
    ).toBeTruthy();
  });

  it("tops the kit up when pressed", async () => {
    const user = userEvent.setup();
    const { dispatch } = setupStale();
    const button = topUpButton();
    if (!button) throw new Error("no top-up button");
    await user.click(button);
    expect(dispatch).toHaveBeenCalledWith({ type: "library/topUp" });
  });
});
