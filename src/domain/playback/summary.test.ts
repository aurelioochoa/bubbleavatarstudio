// FR-5.8: a loop can say what it will do — how many steps, how long they hold,
// how long one whole cycle runs, and how it blinks — without playing it.
import { describe, expect, it } from "vitest";
import { cycleSteps, summarizeLoop } from "./summary";
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
