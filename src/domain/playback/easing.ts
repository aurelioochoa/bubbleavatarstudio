// Easing curves for loop step transitions (FR-5, docs/02). Pure functions of t∈[0,1].
import { clamp } from "../geometry/primitives";

export type EasingFn = (t: number) => number;

export const linear: EasingFn = (t) => clamp(t, 0, 1);

export const ease: EasingFn = (t) => {
  const c = clamp(t, 0, 1);
  return c < 0.5 ? 4 * c * c * c : 1 - (-2 * c + 2) ** 3 / 2;
};

export const step: EasingFn = (t) => (t >= 1 ? 1 : 0);

/**
 * Analytic underdamped spring settling at 1. `speed` (0.1..3) scales both
 * frequency and decay, so a higher speed arrives sooner and rings more on the
 * way (FR-5.4). The window it is spent in is fixed — a step's transition is
 * the final 40% of its hold, whatever the speed — which is what keeps the
 * curve deterministic and frame-rate independent, and keeps the track's
 * arithmetic out of the knob's reach.
 *
 * `durationSec` was `0.9 / s` until the speed was measured to do nothing:
 * dividing by the same `s` that multiplies both terms cancelled it exactly, so
 * every speed in the legal range returned one curve. Fixing that alone left
 * the slow end short of 1 at t=1 — spring(0.1) reached 0.54 and then snapped —
 * so the residual is detrended by its own end value. That lands every speed on
 * 1 without a jump, and moves s=1 by at most 0.004, which is why the starter
 * library still animates the way it was authored.
 */
export function spring(speed = 1): EasingFn {
  const s = clamp(speed, 0.1, 3);
  const durationSec = 0.9;
  const freq = 1.2 * s;
  const residual = (t: number): number => {
    const k = t * durationSec;
    return Math.exp(-6 * s * k) * Math.cos(2 * Math.PI * freq * k);
  };
  const drift = residual(1);
  return (t) => {
    const c = clamp(t, 0, 1);
    if (c >= 1) return 1;
    return 1 - residual(c) + c * drift;
  };
}

export function transitionFn(
  style: "linear" | "ease" | "spring" | "step",
  springSpeed = 1,
): EasingFn {
  switch (style) {
    case "linear":
      return linear;
    case "ease":
      return ease;
    case "step":
      return step;
    case "spring":
      return spring(springSpeed);
  }
}
