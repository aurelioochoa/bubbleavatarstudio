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
 * frequency and decay so higher speed = snappier settle. Duration is fixed so
 * the curve stays deterministic and frame-rate independent.
 */
export function spring(speed = 1): EasingFn {
  const s = clamp(speed, 0.1, 3);
  const durationSec = 0.9 / s;
  const freq = 1.2 * s;
  return (t) => {
    const c = clamp(t, 0, 1);
    if (c >= 1) return 1;
    const k = c * durationSec;
    return 1 - Math.exp(-6 * s * k) * Math.cos(2 * Math.PI * freq * k);
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
