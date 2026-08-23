// BlinkScheduler + ambient idle motion — deterministic, absolute-time (FR-5, FR-7).
import type { AmbientConfig, BlinkConfig } from "../document/types";

/** Deterministic hash of a string to [0,1). Used to seed blink intervals. */
function hash01(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10_000) / 10_000;
}

/**
 * Blink eyelid closure 0..1 at time tAbsMs, deterministic per loop id:
 * interval j = min + hash(id,j)·(max-min).
 */
export function blinkAt(
  blink: BlinkConfig,
  loopId: string,
  tAbsMs: number,
): number {
  if (!blink.enabled) return 0;
  const dur = blink.durationMs;
  let t = 0;
  let j = 0;
  for (;;) {
    const interval =
      blink.minIntervalMs +
      hash01(`${loopId}:${String(j)}`) *
        (blink.maxIntervalMs - blink.minIntervalMs);
    if (t + interval > tAbsMs) return 0; // in a gap
    const start = t + interval;
    if (tAbsMs < start + dur) {
      // Close and reopen within one duration.
      const half = (tAbsMs - start) / dur;
      return half <= 0.5 ? half * 2 : (1 - half) * 2;
    }
    t = start + dur;
    j++;
    if (j > 10_000) return 0;
  }
}

/** Ambient sinusoidal offsets (FR-7): body and eye channels, deterministic. */
export interface AmbientSample {
  bodyY: number;
  bodyRotationDeg: number;
  eyeY: number;
}

export function ambientAt(cfg: AmbientConfig, tAbsMs: number): AmbientSample {
  if (!cfg.enabled) return { bodyY: 0, bodyRotationDeg: 0, eyeY: 0 };
  const bodyPhase = (2 * Math.PI * tAbsMs) / cfg.bodyPeriodMs;
  const eyePhase = (2 * Math.PI * tAbsMs) / cfg.eyePeriodMs;
  return {
    bodyY: Math.sin(bodyPhase) * cfg.bodyAmplitude,
    bodyRotationDeg: Math.sin(bodyPhase * 0.5) * cfg.bodyAmplitude * 0.4,
    eyeY: Math.sin(eyePhase) * cfg.eyeAmplitude,
  };
}
