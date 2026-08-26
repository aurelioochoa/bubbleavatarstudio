// FR-8.7 the orientation triad: three axes turned by the same rotation the
// character is, projected to screen with the depth that says which of them is
// in front. Node environment — this is arithmetic, not a widget.
import { describe, expect, it } from "vitest";
import { axisTriad } from "./axes";

const rest = { x: 0, y: 0, z: 0 };
const byName = (t: ReturnType<typeof axisTriad>, name: string) => {
  const found = t.find((a) => a.name === name);
  if (!found) throw new Error(`no ${name} axis`);
  return found;
};

describe("the triad at rest", () => {
  const triad = axisTriad(rest, 1);

  it("has three axes, named for what they are", () => {
    expect(triad.map((a) => a.name).sort()).toEqual(["x", "y", "z"]);
  });

  it("points X right, Y up and Z at the viewer", () => {
    // Screen y runs downward, so the up axis is negative there. Z is depth,
    // and at rest it comes straight out of the screen — no length to draw.
    expect(byName(triad, "x").tip).toEqual({ x: 1, y: 0 });
    expect(byName(triad, "y").tip).toEqual({ x: 0, y: -1 });
    const z = byName(triad, "z");
    expect(z.tip.x).toBeCloseTo(0, 9);
    expect(z.tip.y).toBeCloseTo(0, 9);
  });

  it("says Z is the one nearest the viewer", () => {
    expect(byName(triad, "z").depth).toBeGreaterThan(byName(triad, "x").depth);
    expect(byName(triad, "z").depth).toBeGreaterThan(byName(triad, "y").depth);
  });
});

describe("the triad turns with the character", () => {
  it("swings X away from the viewer on a quarter yaw", () => {
    // A positive yaw turns the character toward the viewer's right, so its own
    // right-hand axis goes *back* — the left side is what comes forward. The
    // axis shortens to nothing on screen and sits furthest away in depth.
    const triad = axisTriad({ x: 0, y: 90, z: 0 }, 1);
    const x = byName(triad, "x");
    expect(x.tip.x).toBeCloseTo(0, 6);
    expect(x.depth).toBeLessThan(-0.99);
  });

  it("sends Z off to the side as X comes forward", () => {
    const z = byName(axisTriad({ x: 0, y: 90, z: 0 }, 1), "z");
    expect(Math.abs(z.tip.x)).toBeCloseTo(1, 6);
  });

  it("tips Y away as the face lifts", () => {
    // A positive pitch raises the face, which lays the up-axis back.
    const y = byName(axisTriad({ x: 90, y: 0, z: 0 }, 1), "y");
    expect(y.depth).toBeLessThan(-0.99);
    expect(y.tip.y).toBeCloseTo(0, 6);
  });

  it("keeps every axis on the unit sphere, whatever the turn", () => {
    for (const rot of [
      { x: 0, y: 0, z: 0 },
      { x: 33, y: -71, z: 0 },
      { x: -18, y: 140, z: 0 },
      { x: 90, y: 90, z: 0 },
    ]) {
      for (const a of axisTriad(rot, 1)) {
        const len = Math.hypot(a.tip.x, a.tip.y, a.depth);
        expect(len).toBeCloseTo(1, 6);
      }
    }
  });

  it("scales to the radius it is given, without changing depth", () => {
    const big = axisTriad({ x: 20, y: 40, z: 0 }, 30);
    const unit = axisTriad({ x: 20, y: 40, z: 0 }, 1);
    for (const name of ["x", "y", "z"] as const) {
      expect(byName(big, name).tip.x).toBeCloseTo(
        byName(unit, name).tip.x * 30,
        6,
      );
      // Depth stays normalised: it decides paint order, not size.
      expect(byName(big, name).depth).toBeCloseTo(byName(unit, name).depth, 9);
    }
  });
});

describe("paint order", () => {
  it("comes back sorted back to front, so a far axis draws first", () => {
    const triad = axisTriad({ x: 25, y: 55, z: 0 }, 1);
    const depths = triad.map((a) => a.depth);
    expect([...depths].sort((a, b) => a - b)).toEqual(depths);
  });

  it("puts an axis pointing away first, so the near ones paint over it", () => {
    // At a quarter yaw X is straight back and the other two are edge-on, which
    // makes the expected order unambiguous rather than a float coin-toss.
    const triad = axisTriad({ x: 0, y: 90, z: 0 }, 1);
    expect(triad[0]?.name).toBe("x");
    expect(byName(triad, "x").depth).toBeLessThan(0);
  });
});
