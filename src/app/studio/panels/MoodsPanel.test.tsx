// Moods panel: the searchable card grid (FR-4.9), the selection bar that acts
// on the card in hand and pre-empts a delete FR-5.6 would refuse (FR-4.8), and
// the modal editor (FR-4.1 all seven deltas per eye, FR-4.2 CRUD and reorder,
// FR-4.3 the optional colour override on body and eyes, FR-4.4 cancelable
// edits).
//
// The four cases that opened a per-card kebab now go through the bar, which is
// where those actions moved.
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
import type { Kit } from "../../../domain/document/types";

beforeEach(cleanup);
afterEach(() => {
  vi.unstubAllGlobals();
});

function setup(over: { kit?: (base: Kit) => Kit } = {}) {
  const doc = createDefaultDocument();
  const bubble = doc.bubbles[0];
  if (!bubble) throw new Error("fixture missing bubble");
  const base = effectiveKit(bubble, doc);
  const kit = over.kit ? over.kit(base) : base;
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

/** Puts a card in hand, which is what the selection bar acts on. */
const pick = async (user: ReturnType<typeof userEvent.setup>, name: string) => {
  await user.click(screen.getByRole("button", { name }));
  return screen.getByTestId("mood-selection");
};

const openEditor = async (
  user: ReturnType<typeof userEvent.setup>,
  name: string,
) => {
  const bar = await pick(user, name);
  await user.click(within(bar).getByRole("button", { name: "Editar" }));
  return screen.getByRole("dialog");
};

/** A kit whose last mood no step names, so its delete is actually offered. */
function withSpareMood(base: Kit): Kit {
  const spare = base.moods[0];
  if (!spare) throw new Error("fixture needs a mood");
  return {
    ...base,
    moods: [...base.moods, { ...spare, id: "mood_spare", name: "libre" }],
  };
}

describe("mood cards (FR-4.5, docs/05 §2)", () => {
  it("previews a mood on the stage when its card is clicked (FR-4.4)", async () => {
    const user = userEvent.setup();
    const { onPreview, second } = setup();
    await user.click(screen.getByRole("button", { name: second.name }));
    expect(onPreview).toHaveBeenCalledWith({
      left: second.left,
      right: second.right,
      head: second.head,
      colorOverride: second.colorOverride,
    });
  });
});

describe("mood selection bar (FR-4.2, FR-4.8)", () => {
  it("duplicates the card in hand", async () => {
    const user = userEvent.setup();
    const { dispatch, first } = setup();
    const bar = await pick(user, first.name);
    await user.click(
      within(bar).getByRole("button", { name: `Duplicar · ${first.name}` }),
    );
    expect(dispatch).toHaveBeenCalledWith({
      type: "mood/duplicate",
      moodId: first.id,
    });
  });

  it("reorders by swapping with the neighbour, never by index alone", async () => {
    const user = userEvent.setup();
    const { dispatch, kit, first, second } = setup();
    const bar = await pick(user, first.name);
    await user.click(
      within(bar).getByRole("button", { name: `Bajar · ${first.name}` }),
    );
    const ids = kit.moods.map((m) => m.id);
    expect(dispatch).toHaveBeenCalledWith({
      type: "mood/reorder",
      ids: [second.id, first.id, ...ids.slice(2)],
    });
  });

  it("cannot move the first mood up", async () => {
    const user = userEvent.setup();
    const { first } = setup();
    const bar = await pick(user, first.name);
    expect(
      within(bar)
        .getByRole("button", { name: `Subir · ${first.name}` })
        .hasAttribute("disabled"),
    ).toBe(true);
  });

  it("says how many loops the card in hand is in (FR-4.8)", async () => {
    const user = userEvent.setup();
    const { first } = setup();
    const bar = await pick(user, first.name);
    // `happy` opens six of the starter loops.
    expect(within(bar).getByText("Usado en 6 ciclos")).toBeTruthy();
  });

  it("refuses a delete FR-5.6 would refuse, and says why (FR-4.8)", async () => {
    const user = userEvent.setup();
    const { dispatch, first } = setup();
    const bar = await pick(user, first.name);
    const blocked = within(bar).getByRole("button", {
      name: "No se puede borrar mientras un ciclo lo use",
    });
    expect(blocked.hasAttribute("disabled")).toBe(true);
    await user.click(blocked);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("confirms before deleting, and does nothing when refused (docs/05 §3)", async () => {
    const user = userEvent.setup();
    const { dispatch } = setup({ kit: withSpareMood });
    vi.stubGlobal(
      "confirm",
      vi.fn(() => false),
    );
    const bar = await pick(user, "libre");
    const remove = within(bar).getByRole("button", {
      name: "Eliminar · libre",
    });
    await user.click(remove);
    expect(dispatch).not.toHaveBeenCalled();

    vi.stubGlobal(
      "confirm",
      vi.fn(() => true),
    );
    await user.click(remove);
    expect(dispatch).toHaveBeenCalledWith({
      type: "mood/remove",
      moodId: "mood_spare",
    });
  });
});

describe("mood grid (FR-4.8, FR-4.9)", () => {
  it("counts what is on screen, not what the library holds", async () => {
    const user = userEvent.setup();
    const { kit } = setup();
    expect(screen.getByTestId("mood-count").textContent).toBe(
      String(kit.moods.length),
    );
    await user.type(screen.getByLabelText("Buscar ánimo"), "happy");
    expect(screen.getByTestId("mood-count").textContent).toBe("1");
  });

  it("filters the grid by name, ignoring case (FR-4.9)", async () => {
    const user = userEvent.setup();
    setup();
    await user.type(screen.getByLabelText("Buscar ánimo"), "CURIO");
    // The badge sits inside the card, so read the name from its own node.
    const shown = screen
      .getAllByTestId("mood-card")
      .map((c) => within(c).getByRole("button").textContent?.trim());
    expect(shown).toEqual(["curious"]);
  });

  it("says so rather than showing an empty grid when nothing matches", async () => {
    const user = userEvent.setup();
    setup();
    await user.type(screen.getByLabelText("Buscar ánimo"), "zzzz");
    expect(screen.queryAllByTestId("mood-card")).toHaveLength(0);
    expect(screen.getByText("Ningún ánimo con ese nombre")).toBeTruthy();
  });

  it("hides the add card while a filter is on", async () => {
    // "+ Nuevo ánimo" under a filter would make a mood the filter then hides.
    const user = userEvent.setup();
    setup();
    expect(screen.getByRole("button", { name: "+ Nuevo ánimo" })).toBeTruthy();
    await user.type(screen.getByLabelText("Buscar ánimo"), "happy");
    expect(screen.queryByRole("button", { name: "+ Nuevo ánimo" })).toBeNull();
  });

  it("badges a card with the number of loops that play it (FR-4.8)", () => {
    const { first } = setup();
    const card = screen
      .getAllByTestId("mood-card")
      .find((c) => c.dataset.moodId === first.id);
    expect(
      within(card as HTMLElement).getByTestId("usage-badge").textContent,
    ).toBe("6");
  });

  it("leaves an unused mood unbadged rather than badging it zero", () => {
    setup({ kit: withSpareMood });
    const card = screen
      .getAllByTestId("mood-card")
      .find((c) => c.dataset.moodId === "mood_spare");
    expect(within(card as HTMLElement).queryByTestId("usage-badge")).toBeNull();
  });
});

describe("mood editor linking (FR-4.1)", () => {
  it("starts independent, because two different eyes are what a mood is", async () => {
    const user = userEvent.setup();
    const { first } = setup();
    await openEditor(user, first.name);
    expect(
      screen
        .getByRole("radio", { name: "Independientes" })
        .getAttribute("aria-checked"),
    ).toBe("true");
  });

  it("brings the eyes into step the moment linking is turned on", async () => {
    // Not on the next edit: a control that says "linked" while the two sides
    // visibly differ is lying until something happens to touch one of them.
    // In step means the *same* place, not the opposite one — see the copy test
    // below for why linked gaze is not mirrored gaze.
    const user = userEvent.setup();
    const { dispatch, first } = setup();
    await openEditor(user, first.name);
    await user.click(screen.getByRole("radio", { name: "Vinculados" }));
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    const call = dispatch.mock.calls.at(-1)?.[0] as {
      patch: { left: { offsetX: number }; right: { offsetX: number } };
    };
    expect(call.patch.right.offsetX).toBe(call.patch.left.offsetX);
  });

  it("copies each edit onto the other side while linked", async () => {
    const user = userEvent.setup();
    const { onPreview, first } = setup();
    await openEditor(user, first.name);
    await user.click(screen.getByRole("radio", { name: "Vinculados" }));
    fireEvent.change(screen.getByLabelText("Ojo izquierdo · Rotación Z"), {
      target: { value: "12" },
    });
    const last = onPreview.mock.calls.at(-1)?.[0] as {
      left: { rotationZDeg: number };
      right: { rotationZDeg: number };
    };
    // Copied, not mirrored. Linking two eyes is how a gaze is aimed, and both
    // eyes of a face looking left are turned left; negating one side is what
    // FR-3.3 does to the *resting face's* geometry, and the one-shot mirror
    // action below is where that still lives.
    expect(last.left.rotationZDeg).toBe(12);
    expect(last.right.rotationZDeg).toBe(12);
  });

  it("aims both eyes at the same point on the pad while linked", async () => {
    // The reported defect: linking put the two dots at opposite corners, so a
    // mood could not be pointed anywhere without unlinking first.
    const user = userEvent.setup();
    const { onPreview, first } = setup();
    await openEditor(user, first.name);
    await user.click(screen.getByRole("radio", { name: "Vinculados" }));
    fireEvent.change(
      screen.getByLabelText("Ojo izquierdo · Desplazamiento X"),
      {
        target: { value: "-25" },
      },
    );
    const last = onPreview.mock.calls.at(-1)?.[0] as {
      left: { offsetX: number; offsetY: number };
      right: { offsetX: number; offsetY: number };
    };
    expect(last.right.offsetX).toBe(-25);
    expect(last.right.offsetY).toBe(last.left.offsetY);
  });

  it("offers no separation control while the eyes are independent", async () => {
    // Separation is a property of a pair moving as one. Two eyes edited apart
    // already sit at whatever distance their pads were left at.
    const user = userEvent.setup();
    const { first } = setup();
    await openEditor(user, first.name);
    expect(screen.queryByLabelText("Separación")).toBeNull();
    await user.click(screen.getByRole("radio", { name: "Vinculados" }));
    expect(screen.queryByLabelText("Separación")).not.toBeNull();
  });

  it("moves the two eyes apart symmetrically (FR-4.1)", async () => {
    const user = userEvent.setup();
    const { onPreview, first } = setup();
    await openEditor(user, first.name);
    await user.click(screen.getByRole("radio", { name: "Vinculados" }));
    fireEvent.change(screen.getByLabelText("Separación"), {
      target: { value: "20" },
    });
    const last = onPreview.mock.calls.at(-1)?.[0] as {
      left: { offsetX: number };
      right: { offsetX: number };
    };
    // Symmetric about where the pair was sitting, so widening the gap does not
    // also slide the face's gaze sideways.
    expect(last.left.offsetX).toBe(-10);
    expect(last.right.offsetX).toBe(10);
  });

  it("keeps the separation while the linked gaze moves", async () => {
    const user = userEvent.setup();
    const { onPreview, first } = setup();
    await openEditor(user, first.name);
    await user.click(screen.getByRole("radio", { name: "Vinculados" }));
    fireEvent.change(screen.getByLabelText("Separación"), {
      target: { value: "20" },
    });
    fireEvent.change(
      screen.getByLabelText("Ojo izquierdo · Desplazamiento X"),
      {
        target: { value: "-25" },
      },
    );
    const last = onPreview.mock.calls.at(-1)?.[0] as {
      left: { offsetX: number };
      right: { offsetX: number };
    };
    expect(last.left.offsetX).toBe(-25);
    expect(last.right.offsetX).toBe(-5);
  });

  it("leaves the other side alone while independent", async () => {
    const user = userEvent.setup();
    const { onPreview, first } = setup();
    await openEditor(user, first.name);
    fireEvent.change(screen.getByLabelText("Ojo izquierdo · Rotación Z"), {
      target: { value: "12" },
    });
    const last = onPreview.mock.calls.at(-1)?.[0] as {
      right: { rotationZDeg: number };
    };
    expect(last.right.rotationZDeg).toBe(first.right.rotationZDeg);
  });

  it("edits an eye's offset as one place, on a pad per side (FR-4.1)", async () => {
    const user = userEvent.setup();
    const { onPreview, first } = setup();
    await openEditor(user, first.name);
    expect(screen.getAllByTestId("xy-pad")).toHaveLength(2);
    fireEvent.change(screen.getByLabelText("Ojo derecho · Desplazamiento X"), {
      target: { value: "18" },
    });
    const last = onPreview.mock.calls.at(-1)?.[0] as {
      right: { offsetX: number };
    };
    expect(last.right.offsetX).toBe(18);
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
    fireEvent.change(
      screen.getByLabelText("Ojo izquierdo · Desplazamiento X"),
      {
        target: { value: "7" },
      },
    );
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
      head: first.head,
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

// FR-4.10: a mood turns the whole character, so the editor has to be able to
// author that — otherwise the field exists and nothing but the starter
// library can ever set it.
describe("mood pose (FR-4.10)", () => {
  it("offers all three axes", async () => {
    const user = userEvent.setup();
    const { first } = setup();
    await openEditor(user, first.name);
    const pose = screen.getByRole("group", { name: "Postura" });
    for (const axis of ["Rotación X", "Rotación Y", "Rotación Z"]) {
      expect(within(pose).getByLabelText(axis)).toBeTruthy();
    }
  });

  it("previews the turn before it is committed", async () => {
    const user = userEvent.setup();
    const { onPreview, first } = setup();
    await openEditor(user, first.name);
    fireEvent.change(
      within(screen.getByRole("group", { name: "Postura" })).getByLabelText(
        "Rotación Y",
      ),
      { target: { value: "24" } },
    );
    const last = onPreview.mock.calls.at(-1)?.[0] as {
      head: { x: number; y: number; z: number };
    };
    expect(last.head.y).toBe(24);
  });

  it("saves the pose with the rest of the mood", async () => {
    const user = userEvent.setup();
    const { dispatch, first } = setup();
    await openEditor(user, first.name);
    fireEvent.change(
      within(screen.getByRole("group", { name: "Postura" })).getByLabelText(
        "Rotación X",
      ),
      { target: { value: "-9" } },
    );
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    const call = dispatch.mock.calls.at(-1)?.[0] as {
      patch: { head: { x: number } };
    };
    expect(call.patch.head.x).toBe(-9);
  });

  it("shows the mood's own pose when the editor opens", async () => {
    const user = userEvent.setup();
    const { first } = setup({
      kit: (base) => ({
        ...base,
        moods: base.moods.map((m, i) =>
          i === 0 ? { ...m, head: { x: 7, y: -3, z: 11 } } : m,
        ),
      }),
    });
    await openEditor(user, first.name);
    const pose = screen.getByRole("group", { name: "Postura" });
    expect(
      (within(pose).getByLabelText("Rotación Z") as HTMLInputElement).value,
    ).toBe("11");
  });
});
