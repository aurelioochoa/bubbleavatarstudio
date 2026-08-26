// Loop summary (FR-5.8): what a loop will do, derived without playing it.
// Pure — the same expansion LoopPlayer walks, stated once so the summary can
// never drift from the playback it describes.
import type { BlinkConfig, Loop, LoopStep } from "../document/types";

/**
 * The steps one whole cycle visits, in order. `pingpong` plays the authored
 * order then mirrors back without repeating the turning point; a single step
 * has nothing to mirror.
 */
export function cycleSteps(loop: Loop): LoopStep[] {
  const steps = loop.steps;
  if (loop.mode === "pingpong" && steps.length >= 2) {
    return [...steps, ...[...steps].reverse().slice(1)];
  }
  return steps;
}

export interface LoopSummary {
  /** Authored steps — the number the user edits, not the expanded count. */
  steps: number;
  /** Hold of each authored step, in order. */
  holdsMs: number[];
  /** One whole cycle, including the leg a pingpong loop adds back. */
  totalMs: number;
  blink: BlinkConfig;
}

export function summarizeLoop(loop: Loop): LoopSummary {
  return {
    steps: loop.steps.length,
    holdsMs: loop.steps.map((s) => s.holdMs),
    totalMs: cycleSteps(loop).reduce((a, s) => a + s.holdMs, 0),
    blink: loop.blink,
  };
}

/** One authored step's span on the timeline strip, in milliseconds. */
export interface StepBound {
  stepId: string;
  startMs: number;
  endMs: number;
}

/**
 * FR-6.7: the strip the timeline draws — the authored steps end to end, each
 * as wide as its own hold.
 *
 * Authored, not expanded: a pingpong loop plays five legs but the user wrote
 * three steps, and three is what the track shows. The extra legs are the
 * playhead walking back over the same chips (see `playheadAt`), which is both
 * what the sequence means and the only reading under which a step's width is
 * its duration.
 */
export function stepBounds(loop: Loop): StepBound[] {
  const out: StepBound[] = [];
  let acc = 0;
  for (const s of loop.steps) {
    out.push({ stepId: s.id, startMs: acc, endMs: acc + s.holdMs });
    acc += s.holdMs;
  }
  return out;
}

/** Where the playhead sits on the strip, and what it is over. */
export interface Playhead {
  /** Position along the authored strip, 0..sum of authored holds. */
  ms: number;
  /** The step under the playhead, or null when the loop has none. */
  stepId: string | null;
  /** True while a pingpong cycle is on its return leg. */
  reversing: boolean;
}

/**
 * FR-6.7: elapsed playback time, mapped onto the authored strip.
 *
 * `elapsedMs` is time since the loop started — the same clock `LoopPlayer`
 * walks, so the two can never disagree about which step is live. The mapping
 * is what makes a pingpong legible: its return leg lands back on the chips it
 * already crossed, running the other way, instead of needing chips of its own.
 */
export function playheadAt(loop: Loop, elapsedMs: number): Playhead {
  const bounds = stepBounds(loop);
  const at = (ms: number, stepId: string | null, reversing: boolean) => ({
    ms,
    stepId,
    reversing,
  });
  if (bounds.length === 0) return at(0, null, false);

  const expanded = cycleSteps(loop);
  const total = expanded.reduce((n, s) => n + s.holdMs, 0);
  if (total <= 0) return at(0, bounds[0]?.stepId ?? null, false);

  let e = Math.max(0, elapsedMs);
  if (loop.mode === "once") e = Math.min(e, total);
  else e %= total;

  // Which expanded leg the clock is in, and how far into it.
  let i = 0;
  let acc = 0;
  while (i < expanded.length - 1 && e >= acc + expanded[i].holdMs) {
    acc += expanded[i].holdMs;
    i += 1;
  }
  const into = e - acc;

  // Legs past the authored run are the mirror: expanded index 2n-2-i is the
  // authored step it replays, and it replays it backwards.
  // The index is in range by construction: `cycleSteps` only ever adds the
  // mirror, so i runs 0..2n-2 and the mapping folds the tail back onto 0..n-2.
  const n = bounds.length;
  const reversing = i >= n;
  const b = bounds[reversing ? 2 * n - 2 - i : i];
  return at(reversing ? b.endMs - into : b.startMs + into, b.stepId, reversing);
}
