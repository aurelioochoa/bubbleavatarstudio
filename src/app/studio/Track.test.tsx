// FR-6.6 / FR-6.7: the transport is a permanent full-width track, and its
// timeline is real time — a step is as wide as its hold, and the playhead
// tracks elapsed position without React re-rendering per frame (FR-11.2).
//
// Four cases here came from Stage.test.tsx, where they covered the floating
// dock that the track replaces: play/pause, stop, switching loop, and the
// empty-kit case FR-5.2 asks for.
import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { act } from "react";
import userEvent from "@testing-library/user-event";
import { Track } from "./Track";
import { createStageClock } from "../stage/clock";
import { createDefaultDocument } from "../../domain/document/create";
import { effectiveKit } from "../../domain/document/mutate";
import { translator } from "../i18n";
import type { Kit, Loop } from "../../domain/document/types";
import type { StageMode } from "../stage/StageEngine";

beforeEach(cleanup);

interface Overrides {
  mode?: StageMode;
  loopId?: string | null;
  kit?: (base: Kit) => Kit;
  collapsed?: boolean;
  tray?: boolean;
  selectedStepId?: string | null;
  onToggleCollapsed?: () => void;
  onSelectStep?: (stepId: string | null) => void;
  onScrub?: (ms: number) => void;
  onPlay?: (loopId: string) => void;
  onPause?: () => void;
  onStop?: () => void;
  onSelectLoop?: (loopId: string) => void;
}

function setup(over: Overrides = {}) {
  const doc = createDefaultDocument();
  const bubble = doc.bubbles[0];
  if (!bubble) throw new Error("fixture missing bubble");
  const base = effectiveKit(bubble, doc);
  const kit = over.kit ? over.kit(base) : base;
  const clock = createStageClock();
  const dispatch = vi.fn();
  const loopId = over.loopId === undefined ? (kit.loops[0]?.id ?? null) : null;
  const view = render(
    <Track
      bubble={bubble}
      kit={kit}
      loopId={over.loopId === undefined ? loopId : over.loopId}
      mode={over.mode ?? "stopped"}
      clock={clock}
      dispatch={dispatch}
      t={translator("es")}
      collapsed={over.collapsed ?? false}
      tray={over.tray ?? false}
      selectedStepId={over.selectedStepId ?? null}
      onToggleCollapsed={over.onToggleCollapsed ?? (() => {})}
      onSelectStep={over.onSelectStep ?? (() => {})}
      onScrub={over.onScrub ?? (() => {})}
      onPlay={over.onPlay ?? (() => {})}
      onPause={over.onPause ?? (() => {})}
      onStop={over.onStop ?? (() => {})}
      onSelectLoop={over.onSelectLoop ?? (() => {})}
    />,
  );
  return { doc, bubble, kit, clock, dispatch, view };
}

/** A kit holding one loop whose three steps have known, unequal holds. */
function threeStepKit(base: Kit): Kit {
  const mood = base.moods.map((m) => m.id);
  const loop: Loop = {
    id: "loop_t",
    name: "medida",
    group: "life",
    steps: [
      { id: "s1", moodId: mood[0] ?? "", holdMs: 400, transition: "ease" },
      { id: "s2", moodId: mood[1] ?? "", holdMs: 600, transition: "linear" },
      { id: "s3", moodId: mood[2] ?? "", holdMs: 1000, transition: "spring" },
    ],
    mode: "loop",
    springSpeed: 1,
    blink: {
      enabled: true,
      minIntervalMs: 2400,
      maxIntervalMs: 6000,
      durationMs: 140,
    },
  };
  return { ...base, loops: [loop] };
}

const chips = () => screen.getAllByTestId("step-chip");
const playhead = () => screen.getByTestId("playhead");

describe("Track transport (FR-6.2, FR-6.6)", () => {
  it("plays the selected loop and pauses once it is playing", async () => {
    const user = userEvent.setup();
    const onPlay = vi.fn();
    const { kit } = setup({ mode: "stopped", onPlay });
    await user.click(screen.getByRole("button", { name: "Reproducir" }));
    expect(onPlay).toHaveBeenCalledWith(kit.loops[0]?.id);

    cleanup();
    const onPause = vi.fn();
    setup({ mode: "playing", onPause });
    await user.click(screen.getByRole("button", { name: "Pausar" }));
    expect(onPause).toHaveBeenCalled();
  });

  it("stop is disabled on an already stopped stage", async () => {
    const user = userEvent.setup();
    const onStop = vi.fn();
    setup({ mode: "stopped", onStop });
    expect(
      screen.getByRole("button", { name: "Detener" }).hasAttribute("disabled"),
    ).toBe(true);

    cleanup();
    setup({ mode: "playing", onStop });
    await user.click(screen.getByRole("button", { name: "Detener" }));
    expect(onStop).toHaveBeenCalled();
  });

  it("the loop picker switches which loop the transport owns", async () => {
    const user = userEvent.setup();
    const onSelectLoop = vi.fn();
    const { kit } = setup({ onSelectLoop });
    const second = kit.loops[1];
    if (!second) throw new Error("fixture needs two loops");
    await user.click(screen.getByRole("button", { name: /Ciclo/ }));
    await user.click(screen.getByRole("menuitem", { name: second.name }));
    expect(onSelectLoop).toHaveBeenCalledWith(second.id);
  });

  it("the picker groups the loops the way the catalogue does", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole("button", { name: /Ciclo/ }));
    const menu = screen.getByRole("menu");
    expect(within(menu).getByText("Vida")).toBeTruthy();
    expect(within(menu).getByText("Reacciones")).toBeTruthy();
  });

  it("offers to make the first loop instead of a transport (FR-5.2)", () => {
    setup({ kit: (base) => ({ ...base, loops: [] }), loopId: null });
    expect(screen.queryByRole("button", { name: "Reproducir" })).toBeNull();
    expect(screen.getByRole("button", { name: /Nuevo ciclo/ })).toBeTruthy();
  });
});

describe("Track timeline (FR-6.7)", () => {
  it("makes each step as wide as its own hold", () => {
    setup({ kit: threeStepKit });
    expect(chips().map((c) => c.style.flexGrow)).toEqual([
      "400",
      "600",
      "1000",
    ]);
  });

  it("names the step count and the whole cycle", () => {
    setup({ kit: threeStepKit });
    const summary = screen.getByTestId("track-summary");
    expect(summary.textContent).toContain("3");
    expect(summary.textContent).toContain("2.00 s");
  });

  it("states the cycle a pingpong plays, not the strip it draws", () => {
    // The strip is the three authored steps; the cycle replays two of them on
    // the way back. Both numbers are true of different things, and the one a
    // user timing an animation wants is how long it takes.
    setup({
      kit: (base) => {
        const k = threeStepKit(base);
        return {
          ...k,
          loops: k.loops.map((l) => ({ ...l, mode: "pingpong" })),
        };
      },
    });
    expect(chips()).toHaveLength(3);
    expect(screen.getByTestId("track-summary").textContent).toContain("3.00 s");
  });

  it("rules the strip in whole seconds", () => {
    setup({ kit: threeStepKit });
    const ruler = screen.getByTestId("track-ruler");
    expect(within(ruler).getByText("1.0 s")).toBeTruthy();
    // The strip is 2.00s, so there is no 2.0s label to draw at its very end.
    expect(within(ruler).queryByText("3.0 s")).toBeNull();
  });

  it("parks the playhead at the origin while nothing has played", () => {
    setup({ kit: threeStepKit, mode: "stopped" });
    expect(playhead().style.left).toBe("0%");
  });

  it("moves the playhead on a published frame without re-rendering", () => {
    // FR-11.2 is the whole reason the clock exists: a playhead driven by React
    // state would re-render the tab strip, the chips and every mini-render on
    // them sixty times a second.
    let renders = 0;
    const Count = ({ children }: { children: React.ReactNode }) => {
      renders += 1;
      return <>{children}</>;
    };
    const doc = createDefaultDocument();
    const bubble = doc.bubbles[0];
    if (!bubble) throw new Error("fixture missing bubble");
    const kit = threeStepKit(effectiveKit(bubble, doc));
    const clock = createStageClock();
    render(
      <Count>
        <Track
          bubble={bubble}
          kit={kit}
          loopId="loop_t"
          mode="playing"
          clock={clock}
          dispatch={vi.fn()}
          t={translator("es")}
          collapsed={false}
          tray={false}
          selectedStepId={null}
          onToggleCollapsed={() => {}}
          onSelectStep={() => {}}
          onScrub={() => {}}
          onPlay={() => {}}
          onPause={() => {}}
          onStop={() => {}}
          onSelectLoop={() => {}}
        />
      </Count>,
    );
    const before = renders;

    act(() => {
      clock.publish({ loopId: "loop_t", loopMs: 500 });
    });

    // 500ms of a 2000ms strip.
    expect(playhead().style.left).toBe("25%");
    expect(renders).toBe(before);
  });

  it("reads elapsed against the cycle as the clock advances", () => {
    const { clock } = setup({ kit: threeStepKit, mode: "playing" });
    act(() => {
      clock.publish({ loopId: "loop_t", loopMs: 1620 });
    });
    expect(screen.getByTestId("track-elapsed").textContent).toContain("1.62 s");
  });

  it("wraps the playhead with the cycle rather than running off the end", () => {
    const { clock } = setup({ kit: threeStepKit, mode: "playing" });
    act(() => {
      clock.publish({ loopId: "loop_t", loopMs: 2500 });
    });
    expect(playhead().style.left).toBe("25%");
  });

  it("ignores a frame belonging to a loop it is not drawing", () => {
    // A bubble switch can leave a frame from the outgoing loop in flight; the
    // playhead must not read it against this loop's very different strip.
    const { clock } = setup({ kit: threeStepKit, mode: "playing" });
    act(() => {
      clock.publish({ loopId: "loop_somewhere_else", loopMs: 1800 });
    });
    expect(playhead().style.left).toBe("0%");
  });
});

describe("Track heights (FR-6.6)", () => {
  it("keeps the transport reachable when collapsed, and drops the strip", () => {
    setup({ kit: threeStepKit, collapsed: true });
    expect(screen.getByRole("button", { name: "Reproducir" })).toBeTruthy();
    expect(screen.queryByTestId("step-chip")).toBeNull();
  });

  it("drops the readouts that will not fit a 44px row", () => {
    // Blink and spring belong to the loop, not to the moment; on the Share tab
    // the row is there so playback is one gesture away, nothing more.
    setup({ kit: threeStepKit, collapsed: true });
    expect(screen.queryByTestId("track-blink")).toBeNull();
    expect(screen.queryByLabelText("Velocidad del muelle")).toBeNull();
  });

  it("offers to open the strip back up while it is folded away", async () => {
    const user = userEvent.setup();
    const onToggleCollapsed = vi.fn();
    setup({ kit: threeStepKit, collapsed: true, onToggleCollapsed });
    await user.click(screen.getByRole("button", { name: "Ampliar secuencia" }));
    expect(onToggleCollapsed).toHaveBeenCalled();
  });
});

describe("Track playback controls", () => {
  it("commits a playback mode from the track", async () => {
    const user = userEvent.setup();
    const { dispatch, kit } = setup({ kit: threeStepKit });
    await user.click(screen.getByRole("radio", { name: "Una vez" }));
    expect(dispatch).toHaveBeenCalledWith({
      type: "loop/update",
      loopId: kit.loops[0]?.id,
      patch: { mode: "once" },
    });
  });

  it("states the blink schedule the loop will play", () => {
    setup({ kit: threeStepKit });
    const blink = screen.getByTestId("track-blink");
    expect(blink.textContent).toContain("2.4–6.0 s");
    expect(blink.textContent).toContain("140 ms");
  });
});

// jsdom lays nothing out, so the strip is given a width by hand: every pointer
// mapping below is in the coordinates of a 1000px strip.
const STRIP_PX = 1000;
function measureStrip() {
  const strip = screen.getByTestId("track-strip");
  strip.getBoundingClientRect = () =>
    ({
      left: 0,
      right: STRIP_PX,
      width: STRIP_PX,
      top: 0,
      bottom: 60,
      height: 60,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }) as DOMRect;
  return strip;
}

function firePointer(el: Element, type: string, props: Record<string, number>) {
  const ev = new Event(type, { bubbles: true, cancelable: true });
  Object.assign(ev, props);
  fireEvent(el, ev);
}

describe("Track step selection (FR-6.7)", () => {
  it("selects the step whose chip is pressed", async () => {
    const user = userEvent.setup();
    const onSelectStep = vi.fn();
    setup({ kit: threeStepKit, onSelectStep });
    const second = within(screen.getAllByTestId("step-chip")[1]).getAllByRole(
      "button",
    )[0];
    await user.click(second);
    expect(onSelectStep).toHaveBeenCalledWith("s2");
  });

  it("marks the selected chip for assistive tech, not only in paint", () => {
    setup({ kit: threeStepKit, selectedStepId: "s2" });
    const pressed = chips().map((c) =>
      c.querySelector("button")?.getAttribute("aria-pressed"),
    );
    expect(pressed).toEqual(["false", "true", "false"]);
  });
});

describe("Track retiming (FR-5.9)", () => {
  it("a grip retimes the step on its left", () => {
    const { dispatch } = setup({ kit: threeStepKit });
    measureStrip();
    // The strip is 2000ms over 1000px, so 100px is 200ms. s1 holds 400ms.
    const grip = screen.getAllByTestId("step-grip")[0];
    firePointer(grip, "pointerdown", { pointerId: 1, clientX: 200 });
    firePointer(grip, "pointermove", { pointerId: 1, clientX: 300 });
    expect(dispatch).toHaveBeenLastCalledWith({
      type: "step/update",
      loopId: "loop_t",
      stepId: "s1",
      patch: { holdMs: 600 },
    });
  });

  it("holds the scale it started with rather than chasing its own edit", () => {
    // The strip's pixels-per-millisecond depends on the total, which the drag
    // is changing. Re-reading it mid-drag makes the step chase the pointer at
    // a rate that changes under it; the scale is taken once, at pointerdown.
    const { dispatch } = setup({ kit: threeStepKit });
    measureStrip();
    const grip = screen.getAllByTestId("step-grip")[0];
    firePointer(grip, "pointerdown", { pointerId: 1, clientX: 200 });
    firePointer(grip, "pointermove", { pointerId: 1, clientX: 300 });
    firePointer(grip, "pointermove", { pointerId: 1, clientX: 400 });
    // Both moves are measured from where the drag began, at 2ms per pixel.
    expect(dispatch).toHaveBeenLastCalledWith({
      type: "step/update",
      loopId: "loop_t",
      stepId: "s1",
      patch: { holdMs: 800 },
    });
  });

  it("will not drag a step below a hold that can still be seen", () => {
    const { dispatch } = setup({ kit: threeStepKit });
    measureStrip();
    const grip = screen.getAllByTestId("step-grip")[0];
    firePointer(grip, "pointerdown", { pointerId: 1, clientX: 500 });
    firePointer(grip, "pointermove", { pointerId: 1, clientX: 0 });
    const call = dispatch.mock.calls.at(-1)?.[0] as {
      patch: { holdMs: number };
    };
    expect(call.patch.holdMs).toBe(50);
  });

  it("quantizes to the step the typed field uses", () => {
    const { dispatch } = setup({ kit: threeStepKit });
    measureStrip();
    const grip = screen.getAllByTestId("step-grip")[0];
    firePointer(grip, "pointerdown", { pointerId: 1, clientX: 200 });
    firePointer(grip, "pointermove", { pointerId: 1, clientX: 213 });
    const call = dispatch.mock.calls.at(-1)?.[0] as {
      patch: { holdMs: number };
    };
    expect(call.patch.holdMs % 50).toBe(0);
  });

  it("commits nothing until the pointer actually moves", () => {
    const { dispatch } = setup({ kit: threeStepKit });
    measureStrip();
    firePointer(screen.getAllByTestId("step-grip")[0], "pointerdown", {
      pointerId: 1,
      clientX: 200,
    });
    expect(dispatch).not.toHaveBeenCalled();
  });
});

describe("Track transitions (FR-6.7)", () => {
  it("edits the transition at the seam it happens on", async () => {
    const user = userEvent.setup();
    const { dispatch } = setup({ kit: threeStepKit });
    // The seam after s1 carries s2's entry transition.
    await user.click(screen.getAllByTestId("seam")[0]);
    await user.click(screen.getByRole("menuitem", { name: /Muelle|spring/i }));
    expect(dispatch).toHaveBeenCalledWith({
      type: "step/update",
      loopId: "loop_t",
      stepId: "s2",
      patch: { transition: "spring" },
    });
  });

  it("draws one seam fewer than there are steps", () => {
    // A transition joins two steps; the last one has nothing after it.
    setup({ kit: threeStepKit });
    expect(screen.getAllByTestId("seam")).toHaveLength(2);
  });
});

describe("Track scrubbing (FR-6.7)", () => {
  it("scrubs to the position on the strip that was pressed", () => {
    const onScrub = vi.fn();
    setup({ kit: threeStepKit, onScrub });
    const strip = measureStrip();
    firePointer(strip, "pointerdown", { pointerId: 1, clientX: 250 });
    // A quarter of a 2000ms strip.
    expect(onScrub).toHaveBeenCalledWith(500);
  });

  it("clamps a scrub that lands outside the strip", () => {
    const onScrub = vi.fn();
    setup({ kit: threeStepKit, onScrub });
    const strip = measureStrip();
    firePointer(strip, "pointerdown", { pointerId: 1, clientX: -80 });
    expect(onScrub).toHaveBeenCalledWith(0);
  });

  it("does not scrub when the press was on a grip", () => {
    // The grip is inside the strip, so its pointerdown bubbles; without this
    // every retime would begin by jumping playback to the edge being dragged.
    const onScrub = vi.fn();
    setup({ kit: threeStepKit, onScrub });
    measureStrip();
    firePointer(screen.getAllByTestId("step-grip")[0], "pointerdown", {
      pointerId: 1,
      clientX: 200,
    });
    expect(onScrub).not.toHaveBeenCalled();
  });
});

describe("Track grips (FR-5.9)", () => {
  it("lights both handles of the selected step", () => {
    // A grip belongs to the step on its left but draws on that chip's right
    // edge — which is the selected chip's *left* edge. Lighting only its own
    // chip's grip leaves the selection looking half-handled.
    setup({ kit: threeStepKit, selectedStepId: "s2" });
    const lit = screen
      .getAllByTestId("step-grip")
      .map((g) => !g.className.includes("opacity-0"));
    expect(lit).toEqual([true, true, false]);
  });
});

// FR-5.10: the tray puts the mood library on the track, so a loop can be built
// with the sequence and the moods both in view. Before this, adding a step
// meant remembering a thumbnail from a tab you were no longer looking at.
function transfer() {
  const data = new Map<string, string>();
  return {
    setData: (k: string, v: string) => data.set(k, v),
    getData: (k: string) => data.get(k) ?? "",
    effectAllowed: "",
    dropEffect: "",
  };
}

/**
 * jsdom has no DragEvent, and Testing Library's own drag helpers do not carry
 * `clientX` through to React's synthetic event — which is the only thing the
 * drop cares about. Same shape as the pointer helper above: a plain event with
 * the fields assigned as own properties.
 */
function fireDrag(
  el: Element,
  type: string,
  props: { dataTransfer: unknown; clientX?: number },
) {
  const ev = new Event(type, { bubbles: true, cancelable: true });
  Object.assign(ev, props);
  fireEvent(el, ev);
}

/** Gives the chips a layout so a drop can be resolved to an index. */
function measureChips(width = 100) {
  screen.getAllByTestId("step-chip").forEach((chip, i) => {
    chip.getBoundingClientRect = () =>
      ({
        left: i * width,
        right: (i + 1) * width,
        width,
        top: 0,
        bottom: 60,
        height: 60,
        x: i * width,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect;
  });
}

describe("Track mood tray (FR-5.10)", () => {
  it("shows the tray only when the track is opened for it", () => {
    setup({ kit: threeStepKit });
    expect(screen.queryByTestId("tray-card")).toBeNull();
    cleanup();
    setup({ kit: threeStepKit, tray: true });
    expect(screen.getAllByTestId("tray-card").length).toBeGreaterThan(0);
  });

  it("drops a mood into the sequence at the chip it was let go over", () => {
    const { dispatch, kit } = setup({ kit: threeStepKit, tray: true });
    measureChips();
    const dataTransfer = transfer();
    const card = screen.getAllByTestId("tray-card")[1];
    const strip = screen.getByTestId("track-strip");
    fireDrag(card, "dragstart", { dataTransfer });
    // 150px is inside the second chip, past its midpoint.
    fireDrag(strip, "dragover", { dataTransfer, clientX: 150 });
    fireDrag(strip, "drop", { dataTransfer, clientX: 150 });
    expect(dispatch).toHaveBeenCalledWith({
      type: "step/add",
      loopId: "loop_t",
      step: { moodId: kit.moods[1]?.id, holdMs: 800, transition: "ease" },
      at: 2,
    });
  });

  it("drops past the last chip as an append", () => {
    const { dispatch } = setup({ kit: threeStepKit, tray: true });
    measureChips();
    const dataTransfer = transfer();
    fireDrag(screen.getAllByTestId("tray-card")[0], "dragstart", {
      dataTransfer,
    });
    const strip = screen.getByTestId("track-strip");
    fireDrag(strip, "dragover", { dataTransfer, clientX: 900 });
    fireDrag(strip, "drop", { dataTransfer, clientX: 900 });
    const call = dispatch.mock.calls.at(-1)?.[0] as { at: number };
    expect(call.at).toBe(3);
  });

  it("shows where the step will land while the drag is over the strip", () => {
    setup({ kit: threeStepKit, tray: true });
    measureChips();
    const dataTransfer = transfer();
    fireDrag(screen.getAllByTestId("tray-card")[0], "dragstart", {
      dataTransfer,
    });
    const strip = screen.getByTestId("track-strip");
    expect(screen.queryByTestId("drop-marker")).toBeNull();
    fireDrag(strip, "dragover", { dataTransfer, clientX: 120 });
    expect(screen.getByTestId("drop-marker")).toBeTruthy();
    // The marker sits between the chips it would separate.
    const kids = [...(strip.children as unknown as HTMLElement[])];
    expect(kids.indexOf(screen.getByTestId("drop-marker"))).toBe(1);
  });

  it("takes the marker away when the drag leaves the strip", () => {
    setup({ kit: threeStepKit, tray: true });
    measureChips();
    const dataTransfer = transfer();
    fireDrag(screen.getAllByTestId("tray-card")[0], "dragstart", {
      dataTransfer,
    });
    const strip = screen.getByTestId("track-strip");
    fireDrag(strip, "dragover", { dataTransfer, clientX: 120 });
    fireDrag(strip, "dragleave", { dataTransfer });
    expect(screen.queryByTestId("drop-marker")).toBeNull();
  });

  it("ignores a drop carrying something that is not a mood", () => {
    // The mood grid's own reorder drags travel on the same MIME, and one that
    // wandered onto the track must not silently become a step.
    const { dispatch } = setup({ kit: threeStepKit, tray: true });
    measureChips();
    const dataTransfer = transfer();
    dataTransfer.setData("text/plain", "mood_not_prefixed");
    fireDrag(screen.getByTestId("track-strip"), "drop", {
      dataTransfer,
      clientX: 120,
    });
    expect(dispatch).not.toHaveBeenCalled();
  });
});

describe("Track step reordering (FR-5.2)", () => {
  it("reorders steps by dragging one chip onto another", () => {
    // The step list left the inspector for the track, and its drag came with
    // it. The ← → buttons in the step editor are still the keyboard path.
    const { dispatch } = setup({ kit: threeStepKit });
    const dataTransfer = transfer();
    const grab = (i: number) =>
      within(screen.getAllByTestId("step-chip")[i]).getAllByRole("button")[0];
    fireDrag(grab(0), "dragstart", { dataTransfer });
    fireDrag(grab(2), "dragover", { dataTransfer });
    fireDrag(grab(2), "drop", { dataTransfer });
    expect(dispatch).toHaveBeenCalledWith({
      type: "step/reorder",
      loopId: "loop_t",
      stepIds: ["s2", "s3", "s1"],
    });
  });

  it("does not take a mood from the tray as a reorder", () => {
    // Both drags travel on text/plain. A mood dropped onto a chip has to fall
    // through to the strip's own handler and become a new step, not silently
    // reshuffle the sequence.
    const { dispatch } = setup({ kit: threeStepKit, tray: true });
    measureChips();
    const dataTransfer = transfer();
    fireDrag(screen.getAllByTestId("tray-card")[0], "dragstart", {
      dataTransfer,
    });
    const chip = within(screen.getAllByTestId("step-chip")[1]).getAllByRole(
      "button",
    )[0];
    fireDrag(chip, "drop", { dataTransfer, clientX: 150 });
    expect(dispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: "step/reorder" }),
    );
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: "step/add" }),
    );
  });
});

describe("Track loop summary (FR-5.8)", () => {
  it("states each step's own hold on the chip that is that long", () => {
    // The FR-5.8 summary lived in the Loops panel as a list of durations. The
    // chip is both the duration and a picture of it, so the list went.
    setup({ kit: threeStepKit });
    expect(
      chips().map((c) => within(c).getAllByRole("button")[0].textContent),
    ).toEqual([
      expect.stringContaining("0.40 s"),
      expect.stringContaining("0.60 s"),
      expect.stringContaining("1.00 s"),
    ]);
  });

  it("says so when a loop does not blink at all", () => {
    setup({
      kit: (base) => {
        const k = threeStepKit(base);
        return {
          ...k,
          loops: k.loops.map((l) => ({
            ...l,
            blink: { ...l.blink, enabled: false },
          })),
        };
      },
    });
    expect(screen.getByTestId("track-blink").textContent).toContain(
      "Sin parpadeo",
    );
  });
});
