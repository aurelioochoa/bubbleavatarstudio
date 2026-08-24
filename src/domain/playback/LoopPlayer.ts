// LoopPlayer — pure, absolute-timestamp playback (FR-6, docs/04 ADR).
// advance(tAbsMs) computes the interpolated mood purely from elapsed time, so
// the result is frame-rate independent and trivially testable.
import { transitionFn } from "./easing";
import { cycleSteps } from "./summary";
import type { Kit, Loop, Mood, MoodEye } from "../document/types";

export interface MoodSample {
  left: MoodEye;
  right: MoodEye;
  colorOverride: Mood["colorOverride"];
}

export interface PlaybackState {
  moodId: string | null;
  nextMoodId: string | null;
  /** 0..1 progress into the transition toward nextMoodId. */
  t: number;
  sample: MoodSample;
  /** true once a `once` loop has fully finished. */
  finished: boolean;
}

const KEYS: (keyof MoodEye)[] = [
  "rotationXDeg",
  "rotationYDeg",
  "rotationZDeg",
  "scaleX",
  "scaleY",
  "offsetX",
  "offsetY",
];

export function blendMoods(from: Mood, to: Mood, t: number): MoodSample {
  const blend = (a: MoodEye, b: MoodEye): MoodEye => {
    const out = {} as MoodEye;
    for (const k of KEYS) out[k] = a[k] + (b[k] - a[k]) * t;
    // Scale interpolates multiplicatively — additive blending breaks near zero.
    out.scaleX = a.scaleX * (b.scaleX / a.scaleX) ** t;
    out.scaleY = a.scaleY * (b.scaleY / a.scaleY) ** t;
    return out;
  };
  const co: MoodSample["colorOverride"] =
    t < 0.5 ? from.colorOverride : to.colorOverride;
  return {
    left: blend(from.left, to.left),
    right: blend(from.right, to.right),
    colorOverride: co,
  };
}

function neutralSample(mood: Mood): MoodSample {
  return {
    left: { ...mood.left },
    right: { ...mood.right },
    colorOverride: mood.colorOverride,
  };
}

function moodById(kit: Kit, id: string): Mood | undefined {
  return kit.moods.find((m) => m.id === id);
}

export class LoopPlayer {
  private readonly loop: Loop;
  private readonly kit: Kit;
  private readonly startedAtMs: number;

  constructor(loop: Loop, kit: Kit, startedAtMs = 0) {
    if (loop.steps.length === 0) throw new Error("loop has no steps");
    this.loop = loop;
    this.kit = kit;
    this.startedAtMs = startedAtMs;
  }

  /** Elapsed absolute time within the (possibly pingpong-expanded) timeline. */
  private totalMs(): number {
    return this.expandedSteps().reduce((a, s) => a + s.holdMs, 0);
  }

  /** Loop mode: [s1..sn]; pingpong: forward then mirrored reverse leg.
   * Shared with summarizeLoop (FR-5.8) so the two can never disagree. */
  private expandedSteps() {
    return cycleSteps(this.loop);
  }

  advance(tAbsMs: number): PlaybackState {
    const steps = this.expandedSteps();
    const total = this.totalMs();
    let elapsed = tAbsMs - this.startedAtMs;
    let finished = false;
    if (this.loop.mode === "once") {
      if (elapsed >= total) {
        elapsed = total;
        finished = true;
      }
    } else if (total > 0) {
      elapsed = ((elapsed % total) + total) % total;
    }

    // Walk steps accumulating holdMs.
    let acc = 0;
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const hold = step.holdMs;
      if (elapsed < acc + hold || i === steps.length - 1) {
        const from = moodById(this.kit, step.moodId);
        if (!from) throw new Error(`unknown mood ${step.moodId}`);
        const nextIdx = (i + 1) % steps.length;
        const nextStep = steps[nextIdx];
        const to = moodById(this.kit, nextStep.moodId);
        if (!to) throw new Error(`unknown mood ${nextStep.moodId}`);
        // Transition happens during the final 40% of the hold.
        const transStart = acc + hold * 0.6;
        const t =
          hold === 0 || elapsed <= transStart
            ? 0
            : Math.min((elapsed - transStart) / (acc + hold - transStart), 1);
        const eased = transitionFn(step.transition, this.loop.springSpeed)(t);
        return {
          moodId: step.moodId,
          nextMoodId: nextStep.moodId,
          t: eased,
          sample: t > 0 ? blendMoods(from, to, eased) : neutralSample(from),
          finished,
        };
      }
      acc += hold;
    }
    throw new Error("unreachable");
  }
}
