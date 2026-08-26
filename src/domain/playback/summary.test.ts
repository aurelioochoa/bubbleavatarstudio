// FR-5.8: a loop can say what it will do — how many steps, how long they hold,
// how long one whole cycle runs, and how it blinks — without playing it.
import { describe, expect, it } from "vitest";
import {
  cycleSteps,
  playheadAt,
  stepBounds,
  summarizeLoop,
} from "./summary";
import type { BlinkConfig, Loop, LoopStep } from "../document/types";

const blink: BlinkConfig = {
  enabled: true,
  minIntervalMs: 2000,
  maxIntervalMs: 5000,
  durationMs: 140,
};

function step(id: string, holdMs: number): LoopStep {
  return { id, moodId: `mood_${id}`, holdMs, transition: "ease" };
}

function loop(over: Partial<Loop> = {}): Loop {
  return {
    id: "loop_1",
    name: "idle",
    group: "life",
    steps: [step("a", 400), step("b", 600), step("c", 1000)],
    mode: "loop",
    springSpeed: 1,
    blink,
    ...over,
  };
}

describe("summarizeLoop (FR-5.8)", () => {
  it("counts the steps and sums their holds into one cycle", () => {
    const s = summarizeLoop(loop());
    expect(s.steps).toBe(3);
    expect(s.holdsMs).toEqual([400, 600, 1000]);
    expect(s.totalMs).toBe(2000);
  });

  it("counts the mirrored leg a pingpong cycle actually plays", () => {
    // a→b→c→b→a is what LoopPlayer walks, so it is what the summary reports.
    const s = summarizeLoop(loop({ mode: "pingpong" }));
    expect(s.totalMs).toBe(400 + 600 + 1000 + 600 + 400);
    expect(s.steps).toBe(3); // the authored count is still three
  });

  it("reports the blink schedule the loop carries", () => {
    expect(summarizeLoop(loop()).blink).toEqual(blink);
  });

  it("summarizes an empty loop as zero rather than throwing", () => {
    const s = summarizeLoop(loop({ steps: [] }));
    expect(s).toMatchObject({ steps: 0, totalMs: 0, holdsMs: [] });
  });
});

describe("cycleSteps", () => {
  it("returns the authored order for loop and once", () => {
    expect(cycleSteps(loop()).map((s) => s.id)).toEqual(["a", "b", "c"]);
    expect(cycleSteps(loop({ mode: "once" })).map((s) => s.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("appends the reverse leg without repeating the turning point", () => {
    expect(cycleSteps(loop({ mode: "pingpong" })).map((s) => s.id)).toEqual([
      "a",
      "b",
      "c",
      "b",
      "a",
    ]);
  });

  it("leaves a one-step pingpong alone — there is nothing to mirror", () => {
    const one = loop({ mode: "pingpong", steps: [step("a", 400)] });
    expect(cycleSteps(one).map((s) => s.id)).toEqual(["a"]);
  });
});

// FR-6.7: the track's timeline is real time, so it needs the strip the steps
// are laid on and where the playhead sits on it. Both are derived here rather
// than measured off the DOM — a timeline that reads its own pixels cannot be
// tested, and would disagree with playback the moment a layout rounded.
describe("stepBounds (FR-6.7)", () => {
  it("lays the authored steps end to end, each as wide as its hold", () => {
    expect(stepBounds(loop())).toEqual([
      { stepId: "a", startMs: 0, endMs: 400 },
      { stepId: "b", startMs: 400, endMs: 1000 },
      { stepId: "c", startMs: 1000, endMs: 2000 },
    ]);
  });

  it("lays out the authored steps once, whatever the playback mode", () => {
    // A pingpong cycle plays five legs but the user authored three steps, and
    // three chips is what the timeline draws — the return leg is the playhead
    // walking back over them, not a second row.
    expect(stepBounds(loop({ mode: "pingpong" }))).toEqual(
      stepBounds(loop({ mode: "loop" })),
    );
  });

  it("has no bounds for a loop with no steps", () => {
    expect(stepBounds(loop({ steps: [] }))).toEqual([]);
  });
});

describe("playheadAt (FR-6.7)", () => {
  it("advances along the strip and names the step under it", () => {
    expect(playheadAt(loop(), 0)).toEqual({
      ms: 0,
      stepId: "a",
      reversing: false,
    });
    expect(playheadAt(loop(), 500)).toMatchObject({ ms: 500, stepId: "b" });
    expect(playheadAt(loop(), 1999)).toMatchObject({ ms: 1999, stepId: "c" });
  });

  it("wraps a looping cycle rather than running off the end", () => {
    expect(playheadAt(loop(), 2400)).toMatchObject({ ms: 400, stepId: "b" });
    expect(playheadAt(loop(), 4400)).toMatchObject({ ms: 400, stepId: "b" });
  });

  it("parks a `once` cycle at the end instead of wrapping", () => {
    const once = loop({ mode: "once" });
    expect(playheadAt(once, 9000)).toMatchObject({ ms: 2000, stepId: "c" });
  });

  it("walks back over the same strip on a pingpong's return leg", () => {
    const pp = loop({ mode: "pingpong" });
    // Forward leg is 2000ms; the return leg replays b (600) then a (400).
    expect(playheadAt(pp, 1900)).toMatchObject({
      ms: 1900,
      stepId: "c",
      reversing: false,
    });
    // 300ms into the return leg's b, which runs 1000←1000+600 backwards.
    expect(playheadAt(pp, 2300)).toEqual({
      ms: 700,
      stepId: "b",
      reversing: true,
    });
    // 200ms into the return leg's a, which runs 400 back toward 0.
    expect(playheadAt(pp, 2800)).toEqual({
      ms: 200,
      stepId: "a",
      reversing: true,
    });
  });

  it("is at the origin with nothing under it when the loop has no steps", () => {
    expect(playheadAt(loop({ steps: [] }), 1200)).toEqual({
      ms: 0,
      stepId: null,
      reversing: false,
    });
  });

  it("treats a negative elapsed as the origin, not as a wrap backwards", () => {
    // The engine never charges negative time, but a scrub handed a value from
    // a pointer left of the strip would, and the strip has no left of zero.
    expect(playheadAt(loop(), -500)).toMatchObject({ ms: 0, stepId: "a" });
  });
});
