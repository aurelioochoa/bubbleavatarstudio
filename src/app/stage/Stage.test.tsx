// FR-8 direct manipulation: each drag axis seeds from its own start value,
// and Escape restores the pose held before it. Engine is mocked; we assert on
// the opts StageEngine.update receives.
//
// Also covers the stage overlays of docs/05 §1: the status pill, the gizmo and
// the guide. Playback is not among them any more — the dock that used to float
// here is a full-width track below the whole shell (FR-6.6), and its cases
// moved with it to studio/Track.test.tsx.
import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Stage } from "./Stage";
import { StageEngine } from "./StageEngine";
import { createDefaultDocument } from "../../domain/document/create";
import { effectiveKit } from "../../domain/document/mutate";
import { translator } from "../i18n";
import type { StageMode } from "./StageEngine";

vi.mock("./StageEngine", () => ({
  StageEngine: vi.fn().mockImplementation(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    update: vi.fn(),
  })),
}));

type EngineMock = {
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
};

const engineOf = (): EngineMock => {
  const results = vi.mocked(StageEngine).mock.results as Array<{
    value: EngineMock;
  }>;
  const last = results.at(-1);
  if (!last) throw new Error("StageEngine never constructed");
  return last.value;
};

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
});

interface StageOverrides {
  mode?: StageMode;
  loopId?: string | null;
  onPause?: () => void;
}

function setupStage(overrides: StageOverrides = {}) {
  const doc = createDefaultDocument();
  const bubble = doc.bubbles[0];
  if (!bubble) throw new Error("fixture missing bubble");
  const kit = effectiveKit(bubble, doc);
  const { container } = render(
    <Stage
      bubble={bubble}
      kit={kit}
      loopId={
        overrides.loopId === undefined
          ? (kit.loops[0]?.id ?? null)
          : overrides.loopId
      }
      mode={overrides.mode ?? "stopped"}
      preview={null}
      t={translator("es")}
      onPause={overrides.onPause ?? (() => {})}
    />,
  );
  const el = container.querySelector('[aria-label="bubble stage"]');
  if (!el) throw new Error("stage element missing");
  return { el, kit };
}

function renderStage() {
  return setupStage().el;
}

// jsdom has no PointerEvent; dispatch plain events with coordinates
// assigned as own properties so React handlers can read them.
function firePointer(el: Element, type: string, props: Record<string, number>) {
  const ev = new Event(type, { bubbles: true, cancelable: true });
  Object.assign(ev, props);
  fireEvent(el, ev);
}

function drag(el: Element, dx: number, dy: number) {
  firePointer(el, "pointerdown", { pointerId: 1, clientX: 100, clientY: 100 });
  firePointer(el, "pointermove", {
    pointerId: 1,
    clientX: 100 + dx,
    clientY: 100 + dy,
  });
  firePointer(el, "pointerup", {
    pointerId: 1,
    clientX: 100 + dx,
    clientY: 100 + dy,
  });
}

interface UpdateOpts {
  headRotation: { x: number; y: number; z: number };
  guide: boolean;
}

function lastOpts(): UpdateOpts {
  const calls = engineOf().update.mock.calls as [UpdateOpts][];
  const last = calls.at(-1);
  if (!last) throw new Error("engine.update never called");
  return last[0];
}

function lastHead(): { x: number; y: number; z: number } {
  return lastOpts().headRotation;
}

describe("Stage drag (FR-8.3)", () => {
  // The pointer axes are not the rotation axes. `rotation.y` is the yaw and
  // `rotation.x` the pitch (projection.ts), so a horizontal drag must move the
  // one the pointer is travelling along and leave the other alone. Mapping dx
  // onto the pitch is what made dragging right tip the character upward.
  it("yaws on a horizontal drag and pitches on a vertical one", () => {
    const el = renderStage();
    drag(el, 100, 0);
    expect(lastHead().y).not.toBeCloseTo(0); // horizontal -> yaw
    expect(lastHead().x).toBeCloseTo(0); // and nothing else
    const yawed = lastHead().y;
    drag(el, 0, 100);
    expect(lastHead().x).not.toBeCloseTo(0); // vertical -> pitch
    expect(lastHead().y).toBeCloseTo(yawed); // each axis seeds from its own
  });

  // Signs, against the conventions the projection states: a positive yaw turns
  // the character toward the viewer's right, and a positive pitch lifts the
  // face (screen y runs downward). So the character follows the pointer.
  it("turns the character the way the pointer travels", () => {
    let el = renderStage();
    drag(el, 100, 0);
    expect(lastHead().y).toBeGreaterThan(0); // right -> turns right
    cleanup();
    el = renderStage();
    drag(el, -100, 0);
    expect(lastHead().y).toBeLessThan(0); // left -> turns left
    cleanup();
    el = renderStage();
    drag(el, 0, 100);
    expect(lastHead().x).toBeLessThan(0); // down -> looks down
    cleanup();
    el = renderStage();
    drag(el, 0, -100);
    expect(lastHead().x).toBeGreaterThan(0); // up -> looks up
  });

  it("turns at the observed rate of the reference app", () => {
    const el = renderStage();
    drag(el, 100, 0);
    expect(lastHead().y).toBeCloseTo(30);
  });

  // The drag used to stop dead at ±60 and leave the rest of the turn to the
  // gizmo, which is most of why it read as unresponsive: past a 200px gesture
  // the character simply stopped following the pointer. A drag now reaches the
  // same full turn the gizmo does.
  it("keeps turning past the quarter turn the drag used to stop at", () => {
    const el = renderStage();
    drag(el, 400, 0);
    expect(lastHead().y).toBeCloseTo(120);
    drag(el, 0, -400);
    expect(lastHead().x).toBeCloseTo(120);
  });

  // Past half a turn the angle wraps rather than piling up, so the pose stays
  // in the ±180 the gizmo's own sliders span while the character keeps
  // spinning under a gesture that never lets go.
  it("wraps rather than accumulating past half a turn", () => {
    const el = renderStage();
    drag(el, 700, 0); // 210 degrees of travel
    expect(lastHead().y).toBeCloseTo(-150);
  });

  it("seeds each rotation axis from its own start value across drags", () => {
    const el = renderStage();
    drag(el, 100, 0); // yaw only
    expect(lastHead().y).toBeCloseTo(30);
    expect(lastHead().x).toBeCloseTo(0);
    drag(el, 0, 100); // pitch must not clobber/reset the yaw
    expect(lastHead().y).toBeCloseTo(30);
    expect(lastHead().x).toBeCloseTo(-30);
  });

  it("Escape restores the rotation held before the last drag", () => {
    const el = renderStage();
    drag(el, 40, 40); // pose the head, then keep it
    expect(lastHead()).toEqual({ x: -12, y: 12, z: 0 });
    drag(el, 40, 40); // a second drag the user wants to back out of
    expect(lastHead()).toEqual({ x: -24, y: 24, z: 0 });
    fireEvent.keyDown(el, { key: "Escape" });
    // FR-8.3: Esc is a single-level undo of the drag, not a reset to resting.
    expect(lastHead()).toEqual({ x: -12, y: 12, z: 0 });
  });

  it("Escape with no drag yet leaves the resting rotation alone", () => {
    const el = renderStage();
    fireEvent.keyDown(el, { key: "Escape" });
    expect(lastHead()).toEqual({ x: 0, y: 0, z: 0 });
  });
});

describe("Stage overlays (docs/05 §1)", () => {
  it("status pill names the transport state and the loop on stage", () => {
    const { kit } = setupStage({ mode: "playing" });
    const pill = screen.getByRole("status");
    expect(pill.textContent).toContain("Reproduciendo");
    expect(pill.textContent).toContain(kit.loops[0]?.name ?? "");
  });

  it("status pill reports a resting stage when nothing plays", () => {
    setupStage({ mode: "stopped" });
    expect(screen.getByRole("status").textContent).toContain("En reposo");
  });

  it("pill carries a dot alongside the text, not colour alone (docs/05 §3)", () => {
    setupStage({ mode: "playing" });
    const dot = within(screen.getByRole("status")).getByTestId("status-dot");
    expect(dot.getAttribute("aria-hidden")).toBe("true");
  });

  it("no longer carries the transport it used to float (FR-6.6)", () => {
    // The dock is gone from here, not merely restyled: the room it took is the
    // point of the track. If it comes back the character loses that space and
    // two controls claim the same job.
    setupStage({ mode: "stopped" });
    expect(screen.queryByRole("button", { name: "Reproducir" })).toBeNull();
    expect(screen.queryByLabelText("Ciclo")).toBeNull();
  });
});

describe("Stage gizmo and guide (FR-8.2, FR-8.4)", () => {
  it("keeps its overlays out of the element the engine overwrites", async () => {
    const user = userEvent.setup();
    const { el } = setupStage();
    await user.click(screen.getByRole("button", { name: "Rotar cabeza" }));
    // The engine writes innerHTML every frame, so a child would be wiped.
    expect(
      el.contains(screen.getByRole("group", { name: "Rotar cabeza" })),
    ).toBe(false);
  });

  it("sets all three rotation axes, including the roll drag cannot reach", async () => {
    const user = userEvent.setup();
    setupStage();
    await user.click(screen.getByRole("button", { name: "Rotar cabeza" }));
    fireEvent.change(screen.getByLabelText("Rotación Z"), {
      target: { value: "35" },
    });
    expect(lastHead().z).toBe(35);
    fireEvent.change(screen.getByLabelText("Rotación Y"), {
      target: { value: "140" },
    });
    // The roll is the axis a drag cannot reach at all; the gizmo is the only
    // way to it, which is the reason the gizmo still exists now that a drag
    // covers the whole turn on the other two.
    expect(lastHead()).toEqual({ x: 0, y: 140, z: 35 });
  });

  it("resets the pose from the gizmo", async () => {
    const user = userEvent.setup();
    const { el } = setupStage();
    drag(el, 100, 100);
    await user.click(screen.getByRole("button", { name: "Rotar cabeza" }));
    await user.click(screen.getByRole("button", { name: "Restablecer" }));
    expect(lastHead()).toEqual({ x: 0, y: 0, z: 0 });
  });

  it("asks the engine for the projection guide only once toggled", async () => {
    const user = userEvent.setup();
    setupStage();
    expect(lastOpts().guide).toBe(false);
    await user.click(
      screen.getByRole("button", { name: "Guía de proyección" }),
    );
    expect(lastOpts().guide).toBe(true);
  });
});

// The reference app shows its wireframe only while the pointer is held on the
// character, which is what makes the thing announce itself as a solid at
// exactly the moment you are turning it. Ours had the mesh but no way to see it
// without hunting for a toggle first.
describe("Stage wireframe on drag (FR-8.4)", () => {
  it("shows the mesh while a drag is in progress and hides it after", () => {
    const el = renderStage();
    expect(lastOpts().guide).toBe(false);

    firePointer(el, "pointerdown", {
      pointerId: 1,
      clientX: 100,
      clientY: 100,
    });
    expect(lastOpts().guide).toBe(true);

    firePointer(el, "pointermove", {
      pointerId: 1,
      clientX: 160,
      clientY: 100,
    });
    expect(lastOpts().guide).toBe(true);

    firePointer(el, "pointerup", { pointerId: 1, clientX: 160, clientY: 100 });
    expect(lastOpts().guide).toBe(false);
  });

  it("leaves the mesh up after a drag when the toggle is what turned it on", async () => {
    const t = translator("es");
    const el = renderStage();
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: t("stage.guide") }));
    expect(lastOpts().guide).toBe(true);
    drag(el, 60, 0);
    // The drag must not switch off something the user asked for.
    expect(lastOpts().guide).toBe(true);
  });
});
