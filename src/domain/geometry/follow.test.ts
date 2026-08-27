// FR-8.6 the character follows the cursor: the two pure halves of it, aiming
// and easing. Node environment — no DOM here, which is the point: the
// arithmetic that decides where a character looks is testable without a
// browser, and only the listener that feeds it needs one.
import { describe, expect, it } from "vitest";
import { approachGaze, approachPose, followGaze, followTarget } from "./follow";

const LIMITS = { yaw: 32, pitch: 20 };
const aim = (dx: number, dy: number) =>
  followTarget({ dx, dy, reach: 400, limits: LIMITS });

describe("aiming at the cursor", () => {
  it("looks straight ahead when the cursor is on the centre", () => {
    expect(aim(0, 0)).toEqual({ x: 0, y: 0 });
  });

  it("turns toward the cursor the way a drag does", () => {
    // The drag maps horizontal travel onto the yaw and vertical onto the
    // pitch, and takes the pitch with its sign flipped because screen y runs
    // downward while a positive pitch lifts the face (Stage.onPointerMove).
    // Follow has to agree, or the two ways of turning a head disagree.
    expect(aim(200, 0).y).toBeGreaterThan(0);
    expect(aim(-200, 0).y).toBeLessThan(0);
    expect(aim(0, 200).x).toBeLessThan(0);
    expect(aim(0, -200).x).toBeGreaterThan(0);
  });

  it("reaches its limit exactly at the stated reach", () => {
    expect(aim(400, 0).y).toBeCloseTo(LIMITS.yaw, 6);
    expect(aim(0, -400).x).toBeCloseTo(LIMITS.pitch, 6);
  });

  it("does not keep turning past it, however far the cursor goes", () => {
    // A cursor on another monitor is still just "as far right as it gets".
    expect(aim(4000, 0).y).toBeCloseTo(LIMITS.yaw, 6);
    expect(aim(0, 9999).x).toBeCloseTo(-LIMITS.pitch, 6);
  });

  it("is proportional in between, so the turn tracks the cursor", () => {
    expect(aim(200, 0).y).toBeCloseTo(LIMITS.yaw / 2, 6);
    expect(aim(100, 0).y).toBeCloseTo(LIMITS.yaw / 4, 6);
  });

  it("aims on both axes at once", () => {
    const corner = aim(400, -400);
    expect(corner).toEqual({ x: LIMITS.pitch, y: LIMITS.yaw });
  });

  it("treats a reach of zero as 'already there' rather than dividing by it", () => {
    const t = followTarget({ dx: 5, dy: 5, reach: 0, limits: LIMITS });
    expect(Number.isFinite(t.x)).toBe(true);
    expect(Number.isFinite(t.y)).toBe(true);
  });
});

describe("easing toward the aim", () => {
  const here = { x: 0, y: 0, z: 0 };

  it("moves a fraction of the way, not the whole way", () => {
    const next = approachPose(here, { x: 0, y: 20 }, 0.15);
    expect(next.y).toBeCloseTo(3, 6);
  });

  it("converges without overshooting", () => {
    let pose = here;
    for (let i = 0; i < 200; i++)
      pose = approachPose(pose, { x: 0, y: 20 }, 0.15);
    expect(pose.y).toBeCloseTo(20, 4);
  });

  it("never passes the target on the way", () => {
    let pose = here;
    for (let i = 0; i < 60; i++) {
      pose = approachPose(pose, { x: 0, y: 20 }, 0.3);
      expect(pose.y).toBeLessThanOrEqual(20.000001);
    }
  });

  it("leaves the roll alone — follow turns a head, it does not tilt it", () => {
    const rolled = { x: 0, y: 0, z: 17 };
    expect(approachPose(rolled, { x: 5, y: 5 }, 0.5).z).toBe(17);
  });

  it("takes the shorter arc, so a turned character does not spin the long way", () => {
    // Left at 170° by a drag and now asked for −170°: twenty degrees across
    // the back, not three hundred and forty across the front.
    const next = approachPose({ x: 0, y: 170, z: 0 }, { x: 0, y: -170 }, 0.5);
    // Halfway across the back is the antipode, which `wrapDeg` folds to −180.
    // Same angle as +180; asserting the magnitude says so without pinning a
    // sign the fold is free to choose.
    expect(Math.abs(next.y)).toBeCloseTo(180, 6);
  });

  it("is a no-op at factor 0 and a jump at factor 1", () => {
    const target = { x: 7, y: -9 };
    expect(approachPose(here, target, 0)).toEqual(here);
    const jumped = approachPose(here, target, 1);
    expect(jumped.x).toBeCloseTo(7, 6);
    expect(jumped.y).toBeCloseTo(-9, 6);
  });
});

describe("gazing at the cursor", () => {
  const RANGE = { x: 12, y: 8 };
  const gaze = (dx: number, dy: number) =>
    followGaze({ dx, dy, reach: 400, range: RANGE });

  it("centres the eyes when the cursor is on the centre", () => {
    expect(gaze(0, 0)).toEqual({ x: 0, y: 0 });
  });

  it("slides the eyes the way the cursor went", () => {
    // Face-frame x runs right and y runs down, the same as the screen — so
    // unlike the pitch, neither axis flips. The eyes go where the cursor is.
    expect(gaze(200, 0).x).toBeGreaterThan(0);
    expect(gaze(-200, 0).x).toBeLessThan(0);
    expect(gaze(0, 200).y).toBeGreaterThan(0);
    expect(gaze(0, -200).y).toBeLessThan(0);
  });

  it("reaches its range exactly at the stated reach, and stops there", () => {
    expect(gaze(400, 0).x).toBeCloseTo(RANGE.x, 6);
    expect(gaze(0, 400).y).toBeCloseTo(RANGE.y, 6);
    expect(gaze(9999, 0).x).toBeCloseTo(RANGE.x, 6);
    expect(gaze(0, -9999).y).toBeCloseTo(-RANGE.y, 6);
  });

  it("is proportional in between, so the eyes track rather than flick", () => {
    expect(gaze(200, 0).x).toBeCloseTo(RANGE.x / 2, 6);
    expect(gaze(0, 100).y).toBeCloseTo(RANGE.y / 4, 6);
  });

  it("treats a reach of zero as 'already there' rather than dividing by it", () => {
    const g = followGaze({ dx: 5, dy: 5, reach: 0, range: RANGE });
    expect(g).toEqual({ x: RANGE.x, y: RANGE.y });
  });
});

describe("easing the gaze", () => {
  it("moves a fraction of the way, not the whole way", () => {
    expect(approachGaze({ x: 0, y: 0 }, { x: 10, y: -4 }, 0.5)).toEqual({
      x: 5,
      y: -2,
    });
  });

  it("converges on the target without overshooting", () => {
    let g = { x: 0, y: 0 };
    for (let i = 0; i < 200; i++) g = approachGaze(g, { x: 12, y: 8 }, 0.4);
    expect(g.x).toBeCloseTo(12, 6);
    expect(g.y).toBeCloseTo(8, 6);
  });
});
