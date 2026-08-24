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
