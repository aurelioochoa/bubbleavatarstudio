// FR-4.7 the starter mood library (≥24, spanning the documented bands);
// FR-5.7 the starter loop catalogue (≥20, grouped life/reaction).
//
// This file guards the *content* as data. Whether the composed kit validates
// as a document is create.test.ts's job; here we assert the invariants the
// literals must hold on their own, so a bad record fails at its source.
import { describe, expect, it } from "vitest";
import { MOOD_BANDS, STARTER_MOODS } from "./moods";
import { STARTER_LOOPS } from "./loops";
import type { MoodEye } from "../document/types";

const moodKeys = new Set(STARTER_MOODS.map((m) => m.key));

// Mirrors the bounds validate.ts enforces (validate.ts:118-124). Content that
// drifts outside these would be rejected the moment starterKit() composed it.
const EYE_RANGES: Record<keyof MoodEye, [number, number]> = {
  rotationXDeg: [-360, 360],
  rotationYDeg: [-360, 360],
  rotationZDeg: [-360, 360],
  scaleX: [0.1, 3],
  scaleY: [0.1, 3],
  offsetX: [-400, 400],
  offsetY: [-400, 400],
};

describe("starter moods (FR-4.7)", () => {
  it("ships at least 24 moods", () => {
    expect(STARTER_MOODS.length).toBeGreaterThanOrEqual(24);
  });

  it("spans every documented band", () => {
    const seen = new Set(STARTER_MOODS.map((m) => m.band));
    for (const band of MOOD_BANDS) expect(seen.has(band)).toBe(true);
  });

  it("has unique, non-empty keys and names", () => {
    const names = STARTER_MOODS.map((m) => m.name);
    const keys = STARTER_MOODS.map((m) => m.key);
    expect(new Set(names).size).toBe(names.length);
    expect(new Set(keys).size).toBe(keys.length);
    for (const m of STARTER_MOODS) {
      expect(m.name.trim()).not.toBe("");
      expect(m.key.trim()).not.toBe("");
    }
  });

  it("keeps every eye delta inside the range validate.ts accepts", () => {
    for (const mood of STARTER_MOODS) {
      for (const side of ["left", "right"] as const) {
        for (const [field, [lo, hi]] of Object.entries(EYE_RANGES)) {
          const v = mood[side][field as keyof MoodEye];
          expect(Number.isFinite(v)).toBe(true);
          expect(v, `${mood.key}.${side}.${field}`).toBeGreaterThanOrEqual(lo);
          expect(v, `${mood.key}.${side}.${field}`).toBeLessThanOrEqual(hi);
        }
      }
    }
  });

  // The domain has supported per-eye deltas all along; only create.ts's mood()
  // helper collapsed them. The library is where that capability shows up.
  it("uses asymmetric eyes where the expression calls for it", () => {
    const asymmetric = STARTER_MOODS.filter(
      (m) => JSON.stringify(m.left) !== JSON.stringify(m.right),
    );
    expect(asymmetric.length).toBeGreaterThan(0);
  });
});

describe("starter loops (FR-5.7)", () => {
  it("ships at least 20 loops", () => {
    expect(STARTER_LOOPS.length).toBeGreaterThanOrEqual(20);
  });

  it("fills both groups", () => {
    const life = STARTER_LOOPS.filter((l) => l.group === "life");
    const reaction = STARTER_LOOPS.filter((l) => l.group === "reaction");
    expect(life.length).toBeGreaterThan(0);
    expect(reaction.length).toBeGreaterThan(0);
    expect(life.length + reaction.length).toBe(STARTER_LOOPS.length);
  });

  it("has unique, non-empty keys and names", () => {
    const names = STARTER_LOOPS.map((l) => l.name);
    const keys = STARTER_LOOPS.map((l) => l.key);
    expect(new Set(names).size).toBe(names.length);
    expect(new Set(keys).size).toBe(keys.length);
    for (const l of STARTER_LOOPS) {
      expect(l.name.trim()).not.toBe("");
      expect(l.key.trim()).not.toBe("");
    }
  });

  it("resolves every step to a mood in the library", () => {
    for (const loop of STARTER_LOOPS) {
      expect(loop.steps.length).toBeGreaterThan(0);
      for (const step of loop.steps) {
        expect(moodKeys.has(step.mood), `${loop.key} → ${step.mood}`).toBe(
          true,
        );
      }
    }
  });

  // StudioView.test.tsx leans on this: deleting a starter mood is blocked by
  // E_REF (FR-5.6) because a starter loop references it. Keep that true.
  it("references every mood from at least one loop", () => {
    const used = new Set(
      STARTER_LOOPS.flatMap((l) => l.steps.map((s) => s.mood)),
    );
    for (const key of moodKeys) expect(used.has(key), key).toBe(true);
  });

  it("keeps timings and blink inside the range validate.ts accepts", () => {
    for (const loop of STARTER_LOOPS) {
      expect(loop.springSpeed).toBeGreaterThanOrEqual(0.1);
      expect(loop.springSpeed).toBeLessThanOrEqual(3);
      for (const step of loop.steps) {
        expect(step.holdMs, loop.key).toBeGreaterThan(0);
        expect(step.holdMs, loop.key).toBeLessThanOrEqual(60_000);
      }
      const b = loop.blink;
      if (b.enabled) {
        expect(b.minIntervalMs, loop.key).toBeGreaterThan(0);
        expect(b.durationMs, loop.key).toBeGreaterThan(0);
        expect(b.minIntervalMs, loop.key).toBeLessThanOrEqual(b.maxIntervalMs);
      }
    }
  });
});

// FR-4.10: a mood turns the whole character, and the starter library has to
// use that or the feature ships invisible — every animation would still be
// eyes moving on a body that never moves.
describe("starter poses (FR-4.10)", () => {
  const posed = STARTER_MOODS.filter(
    (m) => m.head.x !== 0 || m.head.y !== 0 || m.head.z !== 0,
  );

  it("gives most of the library a pose of its own", () => {
    expect(posed.length).toBeGreaterThanOrEqual(STARTER_MOODS.length - 1);
  });

  it("keeps every angle inside the half turn the schema allows", () => {
    for (const m of STARTER_MOODS) {
      for (const axis of [m.head.x, m.head.y, m.head.z]) {
        expect(Number.isFinite(axis)).toBe(true);
        expect(Math.abs(axis)).toBeLessThanOrEqual(180);
      }
    }
  });

  it("keeps them small enough to read as a reaction, not a camera move", () => {
    // A body swinging tens of degrees per keyframe reads as a character being
    // shaken. The observed reference values sat in the low tens too.
    for (const m of STARTER_MOODS) {
      for (const axis of [m.head.x, m.head.y, m.head.z]) {
        expect(Math.abs(axis)).toBeLessThanOrEqual(25);
      }
    }
  });

  it("sinks further the sleepier the mood gets", () => {
    // The three sleepy stages are a sequence, so their pitches should be one
    // too — a library where they were unordered would look arbitrary in a
    // loop that walks them.
    const pitch = (key: string) => {
      const m = STARTER_MOODS.find((x) => x.key === key);
      if (!m) throw new Error(`no starter mood ${key}`);
      return m.head.x;
    };
    expect(pitch("sleepy")).toBeGreaterThan(pitch("drowsy"));
    expect(pitch("drowsy")).toBeGreaterThan(pitch("dozing"));
  });

  it("does not move a mood the loops use as a neutral resting point", () => {
    const calm = STARTER_MOODS.find((m) => m.key === "calm");
    expect(Math.abs(calm?.head.y ?? 99)).toBeLessThanOrEqual(2);
  });
});
