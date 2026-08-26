// FR-9.3: importing a project replaces everything, so the confirmation says
// what is in the file being imported — counted across every kit it carries,
// not just the starter one.
import { describe, expect, it } from "vitest";
import { moodUsage, summarizeDocument } from "./summary";
import { createDefaultDocument } from "./create";
import { addBubble, addMood } from "./mutate";
import type { Kit, MoodEye, StudioDocument } from "./types";

const ok = (r: ReturnType<typeof addBubble>): StudioDocument => {
  if (!r.ok) throw new Error(r.detail);
  return r.doc;
};

const eye = (): MoodEye => ({
  rotationXDeg: 0,
  rotationYDeg: 0,
  rotationZDeg: 0,
  scaleX: 1,
  scaleY: 1,
  offsetX: 0,
  offsetY: 0,
});

const loop = (id: string, moodIds: string[]): Kit["loops"][number] => ({
  id,
  name: id,
  group: "life",
  steps: moodIds.map((moodId, i) => ({
    id: `${id}_s${String(i)}`,
    moodId,
    holdMs: 400,
    transition: "ease",
  })),
  mode: "loop",
  springSpeed: 1,
  blink: {
    enabled: true,
    minIntervalMs: 2000,
    maxIntervalMs: 5000,
    durationMs: 140,
  },
});

describe("summarizeDocument (FR-9.3)", () => {
  it("counts the bubbles and the starter kit a fresh project ships", () => {
    const doc = createDefaultDocument();
    const s = summarizeDocument(doc);
    expect(s.bubbles).toBe(doc.bubbles.length);
    expect(s.moods).toBe(doc.starterKit.moods.length);
    expect(s.loops).toBe(doc.starterKit.loops.length);
  });

  it("adds the private kit a bubble owns once it has diverged", () => {
    const base = createDefaultDocument();
    const two = ok(addBubble(base, "Second"));
    const target = two.bubbles[1];
    if (!target) throw new Error("fixture missing second bubble");
    // The first behaviour edit clones the starter kit into ownKit (docs/03 §5),
    // so from here the file really does carry two kits' worth of content.
    const diverged = ok(addMood(two, target.id, "surprised"));
    const s = summarizeDocument(diverged);
    expect(s.bubbles).toBe(2);
    expect(s.moods).toBe(base.starterKit.moods.length * 2 + 1);
    expect(s.loops).toBe(base.starterKit.loops.length * 2);
  });
});

// FR-4.8: a mood card says how many loops use it, so a delete that FR-5.6
// would refuse is disabled with its reason before the user reaches for it.
describe("moodUsage (FR-4.8)", () => {
  const kit = (): Kit => ({
    moods: [
      { id: "m_a", name: "a", left: eye(), right: eye(), colorOverride: null },
      { id: "m_b", name: "b", left: eye(), right: eye(), colorOverride: null },
      { id: "m_c", name: "c", left: eye(), right: eye(), colorOverride: null },
    ],
    loops: [
      loop("l_1", ["m_a", "m_b"]),
      loop("l_2", ["m_a"]),
      loop("l_3", ["m_a", "m_a"]),
    ],
  });

  it("counts the loops that reference each mood", () => {
    expect(moodUsage(kit())).toEqual({ m_a: 3, m_b: 1, m_c: 0 });
  });

  it("counts a loop once however many of its steps name the same mood", () => {
    // l_3 names m_a twice. "Used in 3 loops" is what the user can act on;
    // "used 4 times" would not tell them where to go and remove it.
    expect(moodUsage(kit()).m_a).toBe(3);
  });

  it("gives every mood in the kit an entry, including the unused ones", () => {
    // An absent key would read as undefined at the call site and render as a
    // blank badge rather than the zero that makes the delete safe.
    expect(Object.keys(moodUsage(kit())).sort()).toEqual(["m_a", "m_b", "m_c"]);
  });

  it("ignores a step naming a mood the kit does not hold", () => {
    const k = kit();
    k.loops.push(loop("l_4", ["m_gone"]));
    expect(moodUsage(k)).toEqual({ m_a: 3, m_b: 1, m_c: 0 });
  });

  it("counts the starter kit's own library without throwing", () => {
    const usage = moodUsage(createDefaultDocument().starterKit);
    expect(Object.keys(usage)).toHaveLength(
      createDefaultDocument().starterKit.moods.length,
    );
  });
});
