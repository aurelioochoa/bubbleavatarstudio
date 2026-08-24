// FR-1.1 default template bubble; FR-9.1 default document shape (docs/03 §1-2)
import { describe, expect, it } from "vitest";
import { createBubble, createDefaultDocument } from "./create";
import { validateDocument } from "./validate";

describe("createBubble", () => {
  it("creates a bubble from the default template with unique id", () => {
    const a = createBubble("Mango");
    const b = createBubble("Mango");
    expect(a.id).not.toBe(b.id);
    expect(a.name).toBe("Mango");
    expect(a.ownKit).toBeNull();
    expect(a.body.surface.width).toBeGreaterThan(0);
    expect(a.body.extras).toEqual([]);
    expect(a.restingFace.linked).toBe(true);
    expect(a.restingFace.spacing).toBeGreaterThan(0);
    expect(a.ambient.enabled).toBe(true);
  });

  // FR-2.6: the shape family is a property of the bubble, and a new bubble
  // starts on the family that renders identically to the pre-v2 outline.
  it("starts on the round shape family", () => {
    expect(createBubble("Mango").body.surface.shape).toBe("round");
  });

  it("trims names", () => {
    expect(createBubble("  Pip ").name).toBe("Pip");
  });
});

describe("createDefaultDocument", () => {
  const doc = createDefaultDocument();

  it("has version 2, kind and locale es", () => {
    expect(doc.version).toBe(2);
    expect(doc.kind).toBe("bubble-studio-project");
    expect(doc.locale).toBe("es");
  });

  it("starts with one bubble, active, and a starter kit with moods and loops", () => {
    expect(doc.bubbles).toHaveLength(1);
    expect(doc.activeBubbleId).toBe(doc.bubbles[0].id);
    // FR-4.7 / FR-5.7 minimums, re-baselined onto the starter library.
    expect(doc.starterKit.moods.length).toBeGreaterThanOrEqual(24);
    expect(doc.starterKit.loops.length).toBeGreaterThanOrEqual(20);
    const moodIds = new Set(doc.starterKit.moods.map((m) => m.id));
    for (const loop of doc.starterKit.loops) {
      expect(loop.steps.length).toBeGreaterThan(0);
      for (const step of loop.steps)
        expect(moodIds.has(step.moodId)).toBe(true);
    }
  });

  it("produces a valid document", () => {
    expect(validateDocument(doc)).toEqual({ ok: true });
  });
});
