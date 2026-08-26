// Loops panel: rename (FR-5.2), the blink card (FR-5.5), the grouped loop list
// with its proportion bars, and the editor for the step the track has in hand
// (FR-5.1, FR-6.7).
//
// The sequence itself moved to the track, and the FR-5.8 summary went with it —
// steps, cycle and blink are stated there now, and each step's own duration is
// the width and the caption of its chip. Track.test.tsx covers those.
//
// Fields are controlled by props and dispatch is a spy that never updates
// them, so each case commits a whole value in one change event.
import { describe, expect, it, vi, beforeEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoopsPanel } from "./LoopsPanel";
import { createDefaultDocument } from "../../../domain/document/create";
import { effectiveKit } from "../../../domain/document/mutate";
import { translator } from "../../i18n";
import type { Kit } from "../../../domain/document/types";

beforeEach(cleanup);

function setup(
  mutate: (k: Kit) => Kit = (k) => k,
  over: { selectedStepId?: string | null } = {},
) {
  const doc = createDefaultDocument();
  const bubble = doc.bubbles[0];
  if (!bubble) throw new Error("fixture missing bubble");
  const kit = mutate(structuredClone(effectiveKit(bubble, doc)));
  const dispatch = vi.fn();
  const onSelectStep = vi.fn();
  const first = kit.loops[0];
  if (!first) throw new Error("fixture missing loop");
  render(
    <LoopsPanel
      kit={kit}
      dispatch={dispatch}
      t={translator("es")}
      selectedLoopId={first.id}
      onSelectLoop={() => {}}
      selectedStepId={over.selectedStepId ?? null}
      onSelectStep={onSelectStep}
    />,
  );
  return { kit, dispatch, loop: first, onSelectStep };
}

/**
 * The loop and blink cards start collapsed: the list is what the panel is for,
 * and these are settings you go looking for. Every case that reaches inside
 * one opens it first, the way a user would.
 */
async function openCard(
  user: ReturnType<typeof userEvent.setup>,
  title: string,
) {
  await user.click(screen.getByRole("button", { name: title }));
}

describe("loop rename (FR-5.2)", () => {
  it("commits the typed name to the selected loop", async () => {
    const user = userEvent.setup();
    const { dispatch, loop } = setup();
    await openCard(user, "Ciclo");
    fireEvent.change(screen.getByLabelText("Nombre del ciclo"), {
      target: { value: "saludo" },
    });
    expect(dispatch).toHaveBeenCalledWith({
      type: "loop/update",
      loopId: loop.id,
      patch: { name: "saludo" },
    });
  });

  it("ignores a blank name rather than committing an invalid one", async () => {
    const user = userEvent.setup();
    const { dispatch } = setup();
    await openCard(user, "Ciclo");
    fireEvent.change(screen.getByLabelText("Nombre del ciclo"), {
      target: { value: "   " },
    });
    expect(dispatch).not.toHaveBeenCalled();
  });
});

describe("blink card (FR-5.5)", () => {
  it("toggles blinking on the selected loop", async () => {
    const user = userEvent.setup();
    const { dispatch, loop } = setup();
    await user.click(screen.getByLabelText("Parpadeo"));
    expect(dispatch).toHaveBeenCalledWith({
      type: "loop/update",
      loopId: loop.id,
      patch: { blink: { ...loop.blink, enabled: !loop.blink.enabled } },
    });
  });

  it("commits a blink duration without touching the intervals", async () => {
    const user = userEvent.setup();
    const { dispatch, loop } = setup();
    await openCard(user, "Parpadeo");
    fireEvent.change(screen.getByLabelText("Duración del parpadeo (ms)"), {
      target: { value: "220" },
    });
    expect(dispatch).toHaveBeenCalledWith({
      type: "loop/update",
      loopId: loop.id,
      patch: { blink: { ...loop.blink, durationMs: 220 } },
    });
  });
});

describe("grouped loop list (docs/05 §2)", () => {
  it("groups the chips under a translated heading per group", () => {
    setup();
    // The starter catalogue ships both groups (FR-5.7).
    expect(screen.getByRole("group", { name: "Vida" })).toBeTruthy();
    expect(screen.getByRole("group", { name: "Reacciones" })).toBeTruthy();
  });

  it("moves a loop between groups", async () => {
    const user = userEvent.setup();
    const { dispatch, loop } = setup();
    await openCard(user, "Ciclo");
    const target = loop.group === "life" ? "Reacciones" : "Vida";
    await user.click(screen.getByRole("radio", { name: target }));
    expect(dispatch).toHaveBeenCalledWith({
      type: "loop/update",
      loopId: loop.id,
      patch: { group: loop.group === "life" ? "reaction" : "life" },
    });
  });

  it("keeps a group the starter catalogue never names selectable", async () => {
    const user = userEvent.setup();
    setup((k) => {
      const l = k.loops[0];
      if (!l) throw new Error("fixture missing loop");
      l.group = "cinemática";
      return k;
    });
    await openCard(user, "Ciclo");
    expect(screen.getByRole("radio", { name: "cinemática" })).toBeTruthy();
  });
});
describe("loop rows (docs/05 §2)", () => {
  it("draws each loop's own proportions, so it can be told by its shape", () => {
    const { loop } = setup((k) => {
      const l = k.loops[0];
      if (!l) throw new Error("fixture missing loop");
      l.steps = [
        {
          id: "s1",
          moodId: l.steps[0]?.moodId ?? "",
          holdMs: 400,
          transition: "ease",
        },
        {
          id: "s2",
          moodId: l.steps[0]?.moodId ?? "",
          holdMs: 1600,
          transition: "ease",
        },
      ];
      return k;
    });
    const shape = screen.getAllByTestId("loop-shape")[0];
    expect(
      [...shape.children].map((c) => (c as HTMLElement).style.flexGrow),
    ).toEqual(["400", "1600"]);
    expect(shape.closest("button")?.textContent).toContain("2.00 s");
    expect(loop.steps).toHaveLength(2);
  });

  it("marks the loop in hand for assistive tech, not only in paint", () => {
    const { loop } = setup();
    const rows = screen.getAllByRole("button", { pressed: true });
    expect(rows.map((r) => r.textContent?.startsWith(loop.name))).toContain(
      true,
    );
  });
});

describe("step editor (FR-5.1, FR-6.7)", () => {
  it("asks for a step rather than showing empty controls", () => {
    setup();
    expect(
      screen.getByText("Elige un paso en la pista para ajustarlo"),
    ).toBeTruthy();
  });

  it("says which step of how many is in hand", () => {
    setup(
      (k) => {
        const l = k.loops[0];
        if (!l) throw new Error("fixture missing loop");
        l.steps = l.steps.map((st, i) => ({ ...st, id: `s${String(i + 1)}` }));
        return k;
      },
      { selectedStepId: "s2" },
    );
    const editor = screen.getByTestId("step-editor");
    expect(editor.textContent).toContain("Paso 2 de");
  });

  it("holds are edited in seconds, the unit the timeline is ruled in", () => {
    const { dispatch, loop } = setup(
      (k) => {
        const l = k.loops[0];
        if (!l) throw new Error("fixture missing loop");
        l.steps = l.steps.map((st, i) => ({
          ...st,
          id: `s${String(i + 1)}`,
          holdMs: 700,
        }));
        return k;
      },
      { selectedStepId: "s2" },
    );
    const field = screen.getByLabelText("Mantener");
    expect((field as HTMLInputElement).value).toBe("0.7");
    fireEvent.change(field, { target: { value: "1.25" } });
    expect(dispatch).toHaveBeenCalledWith({
      type: "step/update",
      loopId: loop.id,
      stepId: "s2",
      patch: { holdMs: 1250 },
    });
  });

  it("commits the entry transition the step is given", async () => {
    const user = userEvent.setup();
    const { dispatch, loop } = withStepIds();
    await user.click(screen.getByRole("radio", { name: "Muelle" }));
    expect(dispatch).toHaveBeenCalledWith({
      type: "step/update",
      loopId: loop.id,
      stepId: "s2",
      patch: { transition: "spring" },
    });
  });

  it("changes which mood a step plays without moving it", async () => {
    const user = userEvent.setup();
    const { dispatch, kit, loop } = withStepIds();
    await user.click(screen.getByRole("button", { name: /^Ánimos:/ }));
    const target = kit.moods[5];
    if (!target) throw new Error("fixture needs six moods");
    await user.click(screen.getByRole("menuitem", { name: target.name }));
    expect(dispatch).toHaveBeenCalledWith({
      type: "step/update",
      loopId: loop.id,
      stepId: "s2",
      patch: { moodId: target.id },
    });
  });

  it("keeps ← → as the keyboard path for reordering (FR-5.2)", async () => {
    // The chips on the track answer a drag; this is the other half of the
    // pair docs/05 §2 asks for, and it moves a step without touching which
    // mood it names.
    const user = userEvent.setup();
    const { dispatch, loop } = withStepIds();
    await user.click(
      screen.getByRole("button", { name: "Mover el paso a la izquierda" }),
    );
    expect(dispatch).toHaveBeenCalledWith({
      type: "step/reorder",
      loopId: loop.id,
      stepIds: ["s2", "s1", "s3"],
    });
  });

  it("cannot move the first step further left", () => {
    setup(stepIds, { selectedStepId: "s1" });
    expect(
      screen
        .getByRole("button", { name: "Mover el paso a la izquierda" })
        .hasAttribute("disabled"),
    ).toBe(true);
  });

  it("lets go of the step it just removed", async () => {
    const user = userEvent.setup();
    const { dispatch, onSelectStep, loop } = withStepIds();
    await user.click(screen.getByRole("button", { name: /^Eliminar ·/ }));
    expect(onSelectStep).toHaveBeenCalledWith(null);
    expect(dispatch).toHaveBeenCalledWith({
      type: "step/remove",
      loopId: loop.id,
      stepId: "s2",
    });
  });
});

/** Gives the first loop's steps predictable ids so a case can name one. */
function stepIds(k: Kit): Kit {
  const l = k.loops[0];
  if (!l) throw new Error("fixture missing loop");
  if (l.steps.length < 3) throw new Error("fixture needs three steps");
  l.steps = l.steps.map((st, i) => ({ ...st, id: `s${String(i + 1)}` }));
  return k;
}

const withStepIds = () => setup(stepIds, { selectedStepId: "s2" });
