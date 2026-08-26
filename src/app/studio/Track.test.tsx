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
