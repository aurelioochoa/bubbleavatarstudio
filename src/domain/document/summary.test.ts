// FR-9.3: importing a project replaces everything, so the confirmation says
// what is in the file being imported — counted across every kit it carries,
// not just the starter one.
import { describe, expect, it } from "vitest";
import { summarizeDocument } from "./summary";
import { createDefaultDocument } from "./create";
import { addBubble, addMood } from "./mutate";
import type { StudioDocument } from "./types";

const ok = (r: ReturnType<typeof addBubble>): StudioDocument => {
  if (!r.ok) throw new Error(r.detail);
  return r.doc;
};

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
