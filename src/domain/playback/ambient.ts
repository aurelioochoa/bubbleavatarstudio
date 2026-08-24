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

/**
 * Blink schedule used while nothing is playing, so a resting character still
 * blinks. Loops carry their own config (FR-5.5); this is the idle default and
 * is not persisted.
 */
export const RESTING_BLINK: BlinkConfig = {
  enabled: true,
  minIntervalMs: 2600,
  maxIntervalMs: 6200,
  durationMs: 150,
};

/** Ambient sinusoidal offsets (FR-7): body and eye channels, deterministic. */
export interface AmbientSample {
  bodyY: number;
  bodyRotationDeg: number;
  eyeY: number;
  /** Micro-saccade: small, quick horizontal eye darts. */
  eyeX: number;
  /** Breathing, a multiplier hovering around 1. */
  bodyScale: number;
}

/** How long the gaze rests between darts. */
const SACCADE_WINDOW_MS = 1700;
/** Fraction of a window spent moving rather than holding. */
const SACCADE_TRAVEL = 0.12;

/**
 * Deterministic micro-saccades (FR-7.2): the gaze holds still, flicks to a new
 * offset, holds again. A pure function of (t, amplitude) — no drift, no state.
 */
function saccadeAt(amplitude: number, tAbsMs: number): number {
  if (amplitude <= 0 || tAbsMs <= 0) return 0;
  const window = Math.floor(tAbsMs / SACCADE_WINDOW_MS);
  const phase = (tAbsMs % SACCADE_WINDOW_MS) / SACCADE_WINDOW_MS;
  const target = (n: number) => (hash01(`saccade:${String(n)}`) * 2 - 1) * amplitude;
  const from = window === 0 ? 0 : target(window - 1);
  const to = target(window);
  if (phase >= SACCADE_TRAVEL) return to;
  // Ease across the short travel so the dart reads as quick, not instant.
  const k = phase / SACCADE_TRAVEL;
  return from + (to - from) * (k * k * (3 - 2 * k));
}

export function ambientAt(cfg: AmbientConfig, tAbsMs: number): AmbientSample {
  if (!cfg.enabled) {
    return { bodyY: 0, bodyRotationDeg: 0, eyeY: 0, eyeX: 0, bodyScale: 1 };
  }
  const bodyPhase = (2 * Math.PI * tAbsMs) / cfg.bodyPeriodMs;
  const eyePhase = (2 * Math.PI * tAbsMs) / cfg.eyePeriodMs;
  return {
    bodyY: Math.sin(bodyPhase) * cfg.bodyAmplitude,
    bodyRotationDeg: Math.sin(bodyPhase * 0.5) * cfg.bodyAmplitude * 0.4,
    eyeY: Math.sin(eyePhase) * cfg.eyeAmplitude,
    eyeX: saccadeAt(cfg.eyeAmplitude * 1.6, tAbsMs),
    // Breathing swells the silhouette by a fraction of a percent per unit of
    // body amplitude — felt rather than seen.
    bodyScale: 1 + Math.sin(bodyPhase) * cfg.bodyAmplitude * 0.0025,
  };
}
