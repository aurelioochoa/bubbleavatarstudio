// FR-5/FR-6 easing and playback behavior, incl. frame-rate independence.
import { describe, expect, it } from "vitest";
import { ease, linear, spring, step, transitionFn } from "./easing";
import { LoopPlayer, blendMoods } from "./LoopPlayer";
import { ambientAt, blinkAt } from "./ambient";
import { starterKit } from "../document/create";
import type { Loop, Mood } from "../document/types";

describe("easing", () => {
  it("endpoints hit 0 and 1 for all curves", () => {
    for (const fn of [linear, ease, step, spring(), spring(2.5)]) {
      expect(fn(0)).toBeCloseTo(0, 5);
      expect(fn(1)).toBe(1);
    }
  });

  it("step jumps only at the end", () => {
    expect(step(0.99)).toBe(0);
    expect(step(1)).toBe(1);
  });

  it("spring settles near 1 before the end", () => {
    expect(spring(1)(0.99)).toBeGreaterThan(0.9);
  });

  it("transitionFn maps styles", () => {
    expect(transitionFn("linear")(0.5)).toBe(0.5);
    expect(transitionFn("step")(0.5)).toBe(0);
    expect(transitionFn("spring", 1.5)(1)).toBe(1);
  });
});

describe("blendMoods", () => {
  const a: Mood = {
    id: "mood_a",
    name: "a",
    left: {
      rotationXDeg: 0,
      rotationYDeg: 0,
      rotationZDeg: 0,
      scaleX: 1,
      scaleY: 1,
      offsetX: 0,
      offsetY: 0,
    },
    right: {
      rotationXDeg: 0,
      rotationYDeg: 0,
      rotationZDeg: 0,
      scaleX: 1,
      scaleY: 1,
      offsetX: 0,
      offsetY: 0,
    },
    colorOverride: null,
  };
  const b: Mood = {
    ...a,
    id: "mood_b",
    left: { ...a.left, scaleX: 2, offsetY: 10 },
    right: { ...a.right, scaleX: 2, offsetY: 10 },
    colorOverride: { body: "#ff8ac2" },
  };

  it("midpoint blends additively and multiplicatively", () => {
    const s = blendMoods(a, b, 0.5);
    expect(s.left.offsetY).toBe(5);
    expect(s.left.scaleX).toBeCloseTo(Math.SQRT2, 5);
  });

  it("colorOverride switches at t=0.5", () => {
    expect(blendMoods(a, b, 0.4).colorOverride).toBeNull();
    expect(blendMoods(a, b, 0.6).colorOverride).toEqual({ body: "#ff8ac2" });
  });
});

describe("LoopPlayer", () => {
  const kit = starterKit({ moods: ["m1", "m2"], loops: ["l1"] });
  // Build a deterministic 2-step loop: 1000ms + 500ms holds.
  const loop: Loop = {
    id: "l1",
    name: "test",
    group: "life",
    steps: [
      { id: "s1", moodId: "m1", holdMs: 1000, transition: "linear" },
      { id: "s2", moodId: "m2", holdMs: 500, transition: "linear" },
    ],
    mode: "loop",
    springSpeed: 1,
    blink: {
      enabled: true,
      minIntervalMs: 2400,
      maxIntervalMs: 6000,
      durationMs: 140,
    },
  };

  it("holds the first mood before the transition window", () => {
    const p = new LoopPlayer(loop, kit, 0);
    const st = p.advance(500);
    expect(st.moodId).toBe("m1");
    expect(st.t).toBe(0);
  });

  it("transitions during the last 40% of the hold", () => {
    const p = new LoopPlayer(loop, kit, 0);
    expect(p.advance(700).t).toBeGreaterThan(0);
    expect(p.advance(999).t).toBeLessThanOrEqual(1);
  });

  it("wraps in loop mode", () => {
    const p = new LoopPlayer(loop, kit, 0);
    const st = p.advance(1600); // total = 1500
    expect(st.moodId).toBe("m1");
  });

  it("is frame-rate independent: sampling vs stepping give equal results", () => {
    const p1 = new LoopPlayer(loop, kit, 0);
    const p2 = new LoopPlayer(loop, kit, 0);
    const sampled = [0, 137, 431, 918, 1234, 1499].map(
      (t) => p1.advance(t).sample,
    );
    // Simulate a low-FPS client by calling advance only at those times too —
    // state is pure, so stepping through intermediate times must not change it.
    let prev = p2.advance(0);
    for (const t of [137, 431, 918, 1234, 1499]) {
      const next = p2.advance(t);
      expect(next.sample).toEqual(p1.advance(t).sample);
      prev = next;
    }
    expect(sampled.length).toBe(6);
    expect(prev.moodId).toBeDefined();
  });

  it("once mode finishes and clamps to the last mood", () => {
    const once: Loop = { ...loop, mode: "once" };
    const p = new LoopPlayer(once, kit, 0);
    const st = p.advance(10_000);
    expect(st.finished).toBe(true);
    expect(st.moodId).toBe("m2");
  });

  it("pingpong mode traverses forward then backward", () => {
    const pp: Loop = { ...loop, mode: "pingpong" };
    const p = new LoopPlayer(pp, kit, 0);
    // Expanded: [s1 1000, s2 500, s1 1000] = 2500ms.
    expect(p.advance(1200).moodId).toBe("m2");
    expect(p.advance(1600).moodId).toBe("m1");
    // Past the total it wraps to the start again.
    expect(p.advance(2600).moodId).toBe("m1");
    expect(p.advance(2600).finished).toBe(false);
  });

  it("rejects loops with no steps", () => {
    const empty: Loop = { ...loop, steps: [] };
    expect(() => new LoopPlayer(empty, kit)).toThrow();
  });
});

describe("blinkAt", () => {
  const blink = {
    enabled: true,
    minIntervalMs: 1000,
    maxIntervalMs: 1000,
    durationMs: 200,
  };

  it("returns 0 outside blinks and peaks at 1 mid-blink", () => {
    expect(blinkAt(blink, "x", 500)).toBe(0);
    expect(blinkAt(blink, "x", 1100)).toBeCloseTo(1, 5);
    expect(blinkAt(blink, "x", 1000 + 50)).toBeCloseTo(0.5, 5);
    expect(blinkAt(blink, "x", 1000 + 100)).toBeCloseTo(1, 5);
    expect(blinkAt(blink, "x", 1000 + 150)).toBeCloseTo(0.5, 5);
    expect(blinkAt(blink, "x", 1300)).toBe(0);
  });

  it("disabled blink always returns 0", () => {
    expect(blinkAt({ ...blink, enabled: false }, "x", 1100)).toBe(0);
  });
});

describe("ambientAt (FR-7)", () => {
  const cfg = {
    enabled: true,
    bodyAmplitude: 3,
    bodyPeriodMs: 5200,
    eyeAmplitude: 1.2,
    eyePeriodMs: 3400,
  };

  it("is sinusoidal and deterministic", () => {
    const s = ambientAt(cfg, 1300);
    expect(s).toEqual(ambientAt(cfg, 1300));
    expect(s.bodyY).toBeLessThanOrEqual(3);
    expect(Math.abs(s.bodyY)).toBeLessThanOrEqual(3.000001);
  });

  it("disabled returns zeros", () => {
    expect(ambientAt({ ...cfg, enabled: false }, 12345)).toEqual({
      bodyY: 0,
      bodyRotationDeg: 0,
      eyeY: 0,
      eyeX: 0,
      // Neutral for a multiplier is 1, not 0.
      bodyScale: 1,
    });
  });

  it("is still at t=0 so a first frame never jumps (FR-7.2)", () => {
    const at0 = ambientAt(cfg, 0);
    expect(at0.eyeX).toBe(0);
    expect(at0.bodyY).toBe(0);
    expect(at0.bodyScale).toBe(1);
  });

  it("darts the gaze and holds it, deterministically (FR-7.2)", () => {
    const seen = new Set<number>();
    for (let t = 0; t < 12_000; t += 100) {
      const x = ambientAt(cfg, t).eyeX;
      expect(Math.abs(x)).toBeLessThanOrEqual(cfg.eyeAmplitude * 1.6 + 1e-9);
      seen.add(Math.round(x * 100));
    }
    // It moves, but spends most of its time holding a handful of positions.
    expect(seen.size).toBeGreaterThan(3);
    expect(seen.size).toBeLessThan(60);
    expect(ambientAt(cfg, 7321).eyeX).toBe(ambientAt(cfg, 7321).eyeX);
  });

  it("breathes around unity (FR-7.2)", () => {
    const scales = [0, 900, 1800, 2700, 3600].map(
      (t) => ambientAt(cfg, t).bodyScale,
    );
    for (const s of scales) expect(Math.abs(s - 1)).toBeLessThan(0.05);
    expect(new Set(scales).size).toBeGreaterThan(1);
  });
});
