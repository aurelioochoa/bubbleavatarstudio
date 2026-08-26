// FR-8.7: the triad serialized. Byte-stable like every other render this repo
// ships, and free of palette literals — the colours come from the caller.
import { describe, expect, it } from "vitest";
import { triadSvg } from "./axes";

const COLORS = { x: "#e5484d", y: "#46a758", z: "#3e63dd", origin: "#8b8d98" };
const svg = (rot = { x: 0, y: 0, z: 0 }) => triadSvg(rot, { colors: COLORS });

describe("triadSvg", () => {
  it("is a standalone square SVG document", () => {
    const out = svg();
    expect(out.startsWith("<svg ")).toBe(true);
    expect(out.endsWith("</svg>")).toBe(true);
    expect(out).toContain('viewBox="0 0 64 64"');
  });

  it("is byte-stable: same rotation in, same bytes out", () => {
    const a = svg({ x: 21, y: -48, z: 0 });
    const b = svg({ x: 21, y: -48, z: 0 });
    expect(a).toBe(b);
  });

  it("moves when the rotation does", () => {
    expect(svg({ x: 0, y: 30, z: 0 })).not.toBe(svg({ x: 0, y: 31, z: 0 }));
  });

  it("draws all three axes, each in the colour it was given", () => {
    const out = svg({ x: 20, y: 35, z: 0 });
    for (const c of [COLORS.x, COLORS.y, COLORS.z]) {
      expect(out).toContain(c);
    }
  });

  it("carries no palette of its own — every colour came from the caller", () => {
    const out = svg({ x: 20, y: 35, z: 0 });
    const hexes = [...out.matchAll(/#[0-9a-f]{3,8}/gi)].map((m) =>
      m[0].toLowerCase(),
    );
    const allowed = new Set(Object.values(COLORS).map((c) => c.toLowerCase()));
    for (const hex of hexes) expect(allowed.has(hex)).toBe(true);
  });

  it("labels the axes, so a colour is never the only cue (docs/05 §3)", () => {
    const out = svg({ x: 20, y: 35, z: 0 });
    expect(out).toContain(">X<");
    expect(out).toContain(">Y<");
    expect(out).toContain(">Z<");
  });

  it("rounds to two decimals, like the scene serializer", () => {
    const out = svg({ x: 13, y: 47, z: 0 });
    const longs = [...out.matchAll(/\d+\.\d{3,}/g)];
    expect(longs).toEqual([]);
  });

  it("fades with depth rather than stepping at the horizon", () => {
    // A hard threshold pops: an axis a degree past edge-on would jump to the
    // dim value while looking identical to one a degree before it. The fade
    // has to be continuous in the angle.
    const op = (yaw: number) => {
      const out = triadSvg({ x: 0, y: yaw, z: 0 }, { colors: COLORS });
      const at = out.indexOf(COLORS.x);
      // Clamped: a negative start makes slice count from the end of the
      // string, which silently reads some other axis's group.
      const g = out.slice(Math.max(0, at - 200), at);
      const m = /opacity="([\d.]+)"/.exec(g);
      return m ? Number(m[1]) : 1;
    };
    // Barely tipped back: still nearly full strength.
    expect(op(4)).toBeGreaterThan(0.9);
    // Straight back: at its dimmest.
    expect(op(90)).toBeLessThan(0.45);
    // And monotonic across the horizon, with no jump.
    expect(op(4)).toBeLessThan(op(1));
    expect(Math.abs(op(1) - op(-1))).toBeLessThan(0.1);
  });

  it("paints the far axis before the near one", () => {
    // At a quarter yaw X points straight back; whatever is drawn first is
    // drawn under, so X's colour must appear before Z's in the output.
    const out = svg({ x: 0, y: 90, z: 0 });
    expect(out.indexOf(COLORS.x)).toBeLessThan(out.indexOf(COLORS.z));
  });
});
