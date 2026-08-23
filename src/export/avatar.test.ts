// FR-10 export: portable avatar building and snapshot determinism.
import { describe, expect, it } from "vitest";
import { buildPortableAvatar, snapshotSvg } from "./avatar";
import { createBubble, createDefaultDocument } from "../domain/document/create";
import { addMood } from "../domain/document/mutate";
import { validateDocument } from "../domain/document/validate";
import full from "../test/fixtures/full.json";
import type { StudioDocument } from "../domain/document/types";

const doc = full as unknown as StudioDocument;

describe("buildPortableAvatar", () => {
  it("inlines the effective kit and prunes orphan moods/empty loops", () => {
    const avatar = buildPortableAvatar(doc.bubbles[1], doc); // ownKit: null → starter kit
    expect(avatar.kind).toBe("bubble-avatar");
    expect(avatar.kit.loops).toHaveLength(doc.starterKit.loops.length);
    // starter kit: sleepy is referenced → no pruning here; assert referential integrity
    const moodIds = new Set(avatar.kit.moods.map((m) => m.id));
    for (const l of avatar.kit.loops) {
      for (const s of l.steps) expect(moodIds.has(s.moodId)).toBe(true);
    }
  });

  it("prunes moods not referenced by any loop", () => {
    let d = createDefaultDocument();
    const r1 = addMood(d, d.bubbles[0].id, "orphan");
    expect(r1.ok).toBe(true);
    if (r1.ok) d = r1.doc;
    const avatar = buildPortableAvatar(d.bubbles[0], d);
    expect(avatar.kit.moods.some((m) => m.name === "orphan")).toBe(false);
  });

  it("clones data — later edits do not leak into the export", () => {
    const avatar = buildPortableAvatar(doc.bubbles[0], doc);
    expect(avatar.bubble).not.toBe(doc.bubbles[0]);
  });
});

describe("snapshotSvg", () => {
  it("is deterministic and honors size and backgrounds", () => {
    const b = createBubble("Snap");
    const a = snapshotSvg(b, { size: 1024, background: null });
    const c = snapshotSvg(b, { size: 1024, background: null });
    expect(a).toBe(c);
    expect(a).toContain('width="1024"');
    const solid = snapshotSvg(b, {
      size: 512,
      background: { type: "solid", color: "#0b0d16" },
    });
    expect(solid).toContain('width="512"');
    expect(solid).toContain("#0b0d16");
  });
});

describe("export integrity", () => {
  it("projected document from a portable avatar validates", () => {
    const avatar = buildPortableAvatar(doc.bubbles[0], doc);
    const projected = {
      version: 1 as const,
      kind: "bubble-studio-project" as const,
      activeBubbleId: avatar.bubble.id,
      locale: "es" as const,
      bubbles: [avatar.bubble],
      starterKit: avatar.kit,
    };
    expect(validateDocument(projected).ok).toBe(true);
  });
});
