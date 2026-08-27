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
import { useState } from "react";
import { act } from "@testing-library/react";
import { createStageClock, type StageClock } from "./clock";
import { Stage, type StageProps } from "./Stage";
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
  onZoom?: (v: number) => void;
  clock?: StageClock;
}

/**
 * The pose is a prop now — the shell owns it, so the Share panel can export
 * the same stage the user is looking at (FR-10.1). A controlled component
 * needs somebody to hold that state, and in the app that is StudioView; here
 * it is this harness, so every case below still drives a real drag.
 */
function Harness({
  onZoom,
  onRender,
  ...props
}: Omit<StageProps, "head" | "onHead" | "zoom" | "onZoom"> & {
  onZoom?: ((v: number) => void) | undefined;
  onRender?: (() => void) | undefined;
}) {
  const [head, setHead] = useState({ x: 0, y: 0, z: 0 });
  const [zoom, setZoom] = useState(1);
  onRender?.();
  return (
    <Stage
      {...props}
      head={head}
      onHead={setHead}
      zoom={zoom}
      onZoom={(v) => {
        setZoom(v);
        onZoom?.(v);
      }}
    />
  );
}

function setupStage(overrides: StageOverrides = {}) {
  const doc = createDefaultDocument();
  const bubble = doc.bubbles[0];
  if (!bubble) throw new Error("fixture missing bubble");
  const kit = effectiveKit(bubble, doc);
  let renderCount = 0;
  const { container } = render(
    <Harness
      onRender={() => {
        renderCount += 1;
      }}
      clock={overrides.clock}
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
      onZoom={overrides.onZoom}
    />,
  );
  const el = container.querySelector('[aria-label="bubble stage"]');
  if (!el) throw new Error("stage element missing");
  return { el, kit, renders: () => renderCount };
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
    const pill = screen.getByTestId("stage-status");
    expect(pill.textContent).toContain("Reproduciendo");
    expect(pill.textContent).toContain(kit.loops[0]?.name ?? "");
  });

  it("status pill reports a resting stage when nothing plays", () => {
    setupStage({ mode: "stopped" });
    expect(screen.getByTestId("stage-status").textContent).toContain(
      "En reposo",
    );
  });

  it("pill carries a dot alongside the text, not colour alone (docs/05 §3)", () => {
    setupStage({ mode: "playing" });
    const dot = within(screen.getByTestId("stage-status")).getByTestId(
      "status-dot",
    );
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
  /**
   * Zoom is a view state, not a document one: it changes how big the character
   * is drawn on this screen and nothing a snapshot or the runtime would see.
   * It is a prop for the same reason the pose is — the Share panel's export
   * frame is portalled onto this column and has to follow it, so the value has
   * to be owned above both.
   */
  it("reports a zoom change upward rather than keeping it", () => {
    const onZoom = vi.fn();
    setupStage({ onZoom });
    fireEvent.change(screen.getByLabelText("Zoom (deslizador)"), {
      target: { value: "150" },
    });
    expect(onZoom).toHaveBeenCalledWith(1.5);
  });

  it("takes a zoom typed into the field as well as dragged on the slider", () => {
    const onZoom = vi.fn();
    setupStage({ onZoom });
    fireEvent.change(screen.getByLabelText("Zoom"), {
      target: { value: "75" },
    });
    expect(onZoom).toHaveBeenCalledWith(0.75);
  });

  it("keeps the zoom control out of the element the engine overwrites", () => {
    const { el } = setupStage();
    expect(el.contains(screen.getByLabelText("Zoom (deslizador)"))).toBe(false);
  });

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

describe("Stage readout and hint (FR-8.2)", () => {
  it("reads the head's three angles back without opening the pad", () => {
    const el = renderStage();
    drag(el, 100, 0);
    const readout = screen.getByRole("group", {
      name: "Orientación de la cabeza",
    });
    expect(within(readout).getByTestId("readout-y").textContent).toBe("30°");
    expect(within(readout).getByTestId("readout-x").textContent).toBe("0°");
  });

  it("resets the pose from the cluster, not only from inside the pad", () => {
    const el = renderStage();
    drag(el, 100, 60);
    expect(lastHead().y).not.toBe(0);
    fireEvent.click(screen.getByRole("button", { name: "Restablecer" }));
    expect(lastHead()).toEqual({ x: 0, y: 0, z: 0 });
  });

  it("retires the drag hint once the head has been turned", () => {
    // An affordance hint that stays after the affordance is used is clutter,
    // and the Share tab draws its own note in that corner.
    const el = renderStage();
    expect(screen.getByText(/Arrastra para girar la cabeza/)).toBeTruthy();
    drag(el, 40, 0);
    expect(screen.queryByText(/Arrastra para girar la cabeza/)).toBeNull();
  });
});

/**
 * FR-8.6: the character follows the cursor while the toggle is on.
 *
 * Only the wiring is decidable here. The arithmetic lives in
 * `domain/geometry/follow.ts` and is tested in node; whether the head actually
 * travels is a browser question, and rides in the e2e smoke — jsdom lays
 * nothing out, so the stage it would measure the cursor against is 0×0.
 */
describe("follow the cursor (FR-8.6)", () => {
  const toggle = () => screen.getByRole("button", { name: "Seguir el cursor" });
  /**
   * A pointer at a point on the window. Built as a MouseEvent because jsdom's
   * synthetic pointer events drop clientX/clientY, and coordinates are the
   * whole content of the message the follow listens for.
   */
  const move = (clientX: number, clientY: number) => {
    fireEvent(window, new MouseEvent("pointermove", { clientX, clientY }));
  };

  it("offers the toggle, off to begin with", () => {
    setupStage();
    expect(toggle().getAttribute("aria-pressed")).toBe("false");
  });

  it("turns on and off again", async () => {
    const user = userEvent.setup();
    setupStage();
    await user.click(toggle());
    expect(toggle().getAttribute("aria-pressed")).toBe("true");
    await user.click(toggle());
    expect(toggle().getAttribute("aria-pressed")).toBe("false");
  });

  it("tells the engine to follow, and to stop", async () => {
    const user = userEvent.setup();
    setupStage();
    await user.click(toggle());
    const on = engineOf().update.mock.calls.at(-1)?.[0] as { follow: boolean };
    expect(on.follow).toBe(true);
    await user.click(toggle());
    const off = engineOf().update.mock.calls.at(-1)?.[0] as { follow: boolean };
    expect(off.follow).toBe(false);
  });

  it("gives the engine a gaze getter, so the eyes look too", async () => {
    const user = userEvent.setup();
    setupStage();
    await user.click(toggle());
    const on = engineOf().update.mock.calls.at(-1)?.[0] as {
      gaze: () => { x: number; y: number } | null;
    };
    // Nothing to look at before the pointer has said where it is.
    expect(on.gaze()).toBeNull();
    // jsdom lays nothing out, so the stage measures 0×0 and every offset is
    // already at the reach — which is exactly what makes the signs readable
    // here without a browser.
    move(40, 40);
    const right = on.gaze();
    expect(right?.x).toBeGreaterThan(0);
    expect(right?.y).toBeGreaterThan(0);
    move(-40, -40);
    const left = on.gaze();
    expect(left?.x).toBeLessThan(0);
    expect(left?.y).toBeLessThan(0);
  });

  it("the intensity dial scales the gaze as well as the turn", async () => {
    const user = userEvent.setup();
    setupStage();
    await user.click(toggle());
    const on = engineOf().update.mock.calls.at(-1)?.[0] as {
      gaze: () => { x: number; y: number } | null;
    };
    move(40, 40);
    const full = on.gaze()?.x ?? 0;
    fireEvent.change(screen.getByLabelText("Intensidad"), {
      target: { value: "40" },
    });
    move(40, 40);
    expect(on.gaze()?.x).toBeCloseTo(full * 0.4, 6);
  });

  it("a drag switches it off — direct manipulation wins (FR-8.1)", () => {
    const { el } = setupStage();
    fireEvent.click(screen.getByRole("button", { name: "Seguir el cursor" }));
    expect(toggle().getAttribute("aria-pressed")).toBe("true");
    fireEvent.pointerDown(el, { clientX: 10, clientY: 10, pointerId: 1 });
    expect(toggle().getAttribute("aria-pressed")).toBe("false");
  });

  it("stops listening to the window once it is switched off", async () => {
    const user = userEvent.setup();
    setupStage();
    const add = vi.spyOn(window, "addEventListener");
    const remove = vi.spyOn(window, "removeEventListener");
    await user.click(toggle());
    expect(add.mock.calls.some(([e]) => e === "pointermove")).toBe(true);
    await user.click(toggle());
    expect(remove.mock.calls.some(([e]) => e === "pointermove")).toBe(true);
    add.mockRestore();
    remove.mockRestore();
  });
});

/**
 * FR-8.6 / FR-11.2: the readout keeps up with a follow without re-rendering.
 *
 * The pose changes every frame while the character follows the cursor, and the
 * degrees beside it have to change with it. React cannot be the thing that
 * writes them at that rate, so the readout subscribes to the clock and sets its
 * own text — the same seam, and the same reason, as the track's playhead.
 */
describe("orientation readout during a follow (FR-8.6)", () => {
  it("takes its degrees from the clock, without a render", () => {
    const clock = createStageClock();
    const { renders } = setupStage({ clock });
    const before = renders();

    act(() => {
      clock.publish({
        loopId: null,
        loopMs: 0,
        head: { x: -12, y: 27, z: 0 },
      });
    });

    expect(screen.getByTestId("readout-y").textContent).toBe("27°");
    expect(screen.getByTestId("readout-x").textContent).toBe("-12°");
    expect(renders()).toBe(before);
  });

  it("rounds the way the pad's own numbers do", () => {
    const clock = createStageClock();
    setupStage({ clock });
    act(() => {
      clock.publish({ loopId: null, loopMs: 0, head: { x: 0, y: 4.6, z: 0 } });
    });
    expect(screen.getByTestId("readout-y").textContent).toBe("5°");
  });
});

/**
 * FR-8.7 the corner triad, and FR-8.6's intensity slider.
 *
 * The triad's arithmetic and its bytes are tested in node; what matters here
 * is that it hangs off the clock rather than off a render, for the same reason
 * the degrees beside it do — the pose moves every frame while a follow runs.
 */
describe("orientation triad (FR-8.7)", () => {
  const toggle = () => screen.getByRole("button", { name: "Ejes" });

  it("is off until asked for, like every other overlay", () => {
    setupStage();
    expect(toggle().getAttribute("aria-pressed")).toBe("false");
    expect(screen.queryByTestId("stage-triad")).toBeNull();
  });

  it("appears on, and draws three axes", async () => {
    const user = userEvent.setup();
    setupStage();
    await user.click(toggle());
    const triad = screen.getByTestId("stage-triad");
    expect(triad.querySelectorAll("line")).toHaveLength(3);
  });

  it("redraws from the clock, without a render (FR-11.2)", async () => {
    const user = userEvent.setup();
    const clock = createStageClock();
    const { renders } = setupStage({ clock });
    await user.click(toggle());
    const before = renders();
    const first = screen.getByTestId("stage-triad").innerHTML;

    act(() => {
      clock.publish({ loopId: null, loopMs: 0, head: { x: 12, y: 44, z: 0 } });
    });

    expect(screen.getByTestId("stage-triad").innerHTML).not.toBe(first);
    expect(renders()).toBe(before);
  });
});

describe("follow intensity (FR-8.6)", () => {
  const followToggle = () =>
    screen.getByRole("button", { name: "Seguir el cursor" });

  it("offers no slider until the follow is on", async () => {
    const user = userEvent.setup();
    setupStage();
    expect(screen.queryByLabelText("Intensidad")).toBeNull();
    await user.click(followToggle());
    expect(screen.getByLabelText("Intensidad")).toBeTruthy();
  });

  it("goes away again when the follow does", async () => {
    const user = userEvent.setup();
    setupStage();
    await user.click(followToggle());
    await user.click(followToggle());
    expect(screen.queryByLabelText("Intensidad")).toBeNull();
  });

  it("starts at full strength and can be turned down", async () => {
    const user = userEvent.setup();
    setupStage();
    await user.click(followToggle());
    const slider = screen.getByLabelText("Intensidad");
    expect(slider.getAttribute("value")).toBe("100");
    fireEvent.change(slider, { target: { value: "40" } });
    expect(screen.getByLabelText("Intensidad").getAttribute("value")).toBe(
      "40",
    );
  });
});

/**
 * FR-12.7: the follow survives touch.
 *
 * FR-8.1 has a grab take the pose back from the cursor, which is right for a
 * mouse — a cursor exists whether or not it is pressed, so pressing means
 * "mine now". A finger only exists while it is down, so the same rule would
 * switch the follow off at the first touch and leave the toggle unusable. The
 * rule is conditional on pointer type instead.
 */
describe("following with a finger (FR-12.7)", () => {
  const toggle = () => screen.getByRole("button", { name: "Seguir el cursor" });

  it("lets a mouse take the pose back from the follow, as before", async () => {
    const user = userEvent.setup();
    const el = renderStage();
    await user.click(toggle());
    expect(toggle().getAttribute("aria-pressed")).toBe("true");

    firePointer(el, "pointerdown", {
      pointerId: 1,
      clientX: 10,
      clientY: 10,
    });

    expect(toggle().getAttribute("aria-pressed")).toBe("false");
  });

  it("keeps following when the pointer that pressed is a finger", async () => {
    const user = userEvent.setup();
    const el = renderStage();
    await user.click(toggle());

    firePointerType(el, "pointerdown", "touch", {
      pointerId: 1,
      clientX: 10,
      clientY: 10,
    });

    expect(toggle().getAttribute("aria-pressed")).toBe("true");
  });
});

/** FR-12.6: pinch scales the stage the way the zoom pill does. */
describe("pinch to zoom (FR-12.6)", () => {
  const pinch = (el: Element, from: number, to: number) => {
    firePointerType(el, "pointerdown", "touch", {
      pointerId: 1,
      clientX: 0,
      clientY: 0,
    });
    firePointerType(el, "pointerdown", "touch", {
      pointerId: 2,
      clientX: from,
      clientY: 0,
    });
    firePointerType(el, "pointermove", "touch", {
      pointerId: 2,
      clientX: to,
      clientY: 0,
    });
    firePointerType(el, "pointerup", "touch", {
      pointerId: 2,
      clientX: to,
      clientY: 0,
    });
    firePointerType(el, "pointerup", "touch", {
      pointerId: 1,
      clientX: 0,
      clientY: 0,
    });
  };

  it("spreading two fingers zooms in", () => {
    const onZoom = vi.fn();
    const { el } = setupStage({ onZoom });
    pinch(el, 100, 200);
    expect(onZoom).toHaveBeenCalled();
    expect(onZoom.mock.calls.at(-1)?.[0]).toBeGreaterThan(1);
  });

  it("pinching them together zooms out", () => {
    const onZoom = vi.fn();
    const { el } = setupStage({ onZoom });
    pinch(el, 200, 100);
    expect(onZoom.mock.calls.at(-1)?.[0]).toBeLessThan(1);
  });

  it("stays inside the same 25–200% the pill is held to", () => {
    const onZoom = vi.fn();
    const { el } = setupStage({ onZoom });
    pinch(el, 100, 4000);
    expect(onZoom.mock.calls.at(-1)?.[0]).toBeLessThanOrEqual(2);

    onZoom.mockClear();
    const second = setupStage({ onZoom });
    pinch(second.el, 4000, 10);
    expect(onZoom.mock.calls.at(-1)?.[0]).toBeGreaterThanOrEqual(0.25);
  });

  /**
   * A second finger landing turns a head drag into a pinch. Without this the
   * head lurches toward whichever finger the drag started under while the
   * other one scales the view.
   */
  it("abandons the head drag the first finger started", () => {
    const { el } = setupStage();
    firePointerType(el, "pointerdown", "touch", {
      pointerId: 1,
      clientX: 0,
      clientY: 0,
    });
    firePointerType(el, "pointerdown", "touch", {
      pointerId: 2,
      clientX: 100,
      clientY: 0,
    });
    firePointerType(el, "pointermove", "touch", {
      pointerId: 1,
      clientX: 90,
      clientY: 90,
    });

    const last = engineOf().update.mock.calls.at(-1)?.[0] as {
      headRotation: { x: number; y: number };
      guide: boolean;
    };
    // The pose is untouched...
    expect(last.headRotation).toEqual({ x: 0, y: 0, z: 0 });
    // ...and so is the wireframe a drag brings up for its length (FR-8.4). It
    // is the visible half of "a drag is in progress", and leaving it on is how
    // an abandoned drag announces that it was never abandoned.
    expect(last.guide).toBe(false);
  });
});

/** Like `firePointer`, with the pointer type spelled out. */
function firePointerType(
  el: Element,
  type: string,
  pointerType: string,
  props: Record<string, number>,
) {
  const ev = new Event(type, { bubbles: true, cancelable: true });
  Object.assign(ev, { ...props, pointerType });
  fireEvent(el, ev);
}
