// FR-4.7 / FR-5.7 for a project that already exists. `starterKit()` runs only
// inside `createDefaultDocument()`, so a document saved before the library
// grew keeps the kit it was saved with. This is the non-destructive top-up
// that closes that gap on request — never on its own, and never by rewriting
// anything the user has touched.
import { describe, expect, it } from "vitest";
import { libraryGap, topUpKit, topUpLibrary } from "./library";
import { createDefaultDocument, starterKit } from "./create";
import { addBubble, addMood } from "./mutate";
import { validateDocument } from "./validate";
import type { MutationResult } from "./mutate";
import type { StudioDocument } from "./types";

const ok = (r: MutationResult): StudioDocument => {
  if (!r.ok) throw new Error(r.detail);
  return r.doc;
};

/** Top up whichever kit the document's active bubble reads. */
const topUp = (doc: StudioDocument): StudioDocument =>
  ok(topUpLibrary(doc, activeOf(doc)));

/** A project as it would have been saved before the library grew. */
function smallProject(): StudioDocument {
  const doc = createDefaultDocument();
  const kit = doc.starterKit;
  const moods = kit.moods.slice(0, 3);
  const keptIds = new Set(moods.map((m) => m.id));
  return {
    ...doc,
    starterKit: {
      moods,
      loops: kit.loops
        .filter((l) => l.steps.every((s) => keptIds.has(s.moodId)))
        .slice(0, 1),
    },
  };
}

describe("libraryGap (FR-4.7, FR-5.7)", () => {
  it("is empty for a document created today", () => {
    expect(libraryGap(createDefaultDocument().starterKit)).toEqual({ moods: 0, loops: 0 });
  });

  it("counts what an older project is missing", () => {
    const doc = smallProject();
    const gap = libraryGap(doc.starterKit);
    expect(gap.moods).toBe(starterKit().moods.length - 3);
    expect(gap.loops).toBe(starterKit().loops.length - doc.starterKit.loops.length);
  });
});

const activeOf = (doc: StudioDocument): string => {
  const id = doc.activeBubbleId ?? doc.bubbles[0]?.id;
  if (!id) throw new Error("fixture has no bubble");
  return id;
};

describe("topUpKit / topUpLibrary", () => {
  it("brings the kit up to the full library", () => {
    const doc = topUp(smallProject());
    expect(doc.starterKit.moods).toHaveLength(starterKit().moods.length);
    expect(doc.starterKit.loops).toHaveLength(starterKit().loops.length);
    expect(libraryGap(doc.starterKit)).toEqual({ moods: 0, loops: 0 });
  });

  it("leaves every existing mood exactly as the user left it", () => {
    const base = smallProject();
    const renamed: StudioDocument = {
      ...base,
      starterKit: {
        ...base.starterKit,
        moods: base.starterKit.moods.map((m, i) =>
          i === 0 ? { ...m, name: "mi ánimo" } : m,
        ),
      },
    };
    const doc = topUp(renamed);
    // Same id, same name, same position: a top-up adds, it never rewrites.
    expect(doc.starterKit.moods[0]).toEqual(renamed.starterKit.moods[0]);
  });

  it("restores a library entry whose name the user has taken elsewhere", () => {
    // Renaming a starter mood frees the library's name, so that entry really
    // is missing — it comes back beside the rename rather than being skipped.
    const base = smallProject();
    const first = base.starterKit.moods[0];
    if (!first) throw new Error("fixture missing mood");
    const renamed: StudioDocument = {
      ...base,
      starterKit: {
        ...base.starterKit,
        moods: base.starterKit.moods.map((m) =>
          m.id === first.id ? { ...m, name: "mi ánimo" } : m,
        ),
      },
    };
    const doc = topUp(renamed);
    const restored = doc.starterKit.moods.filter((m) => m.name === first.name);
    expect(restored).toHaveLength(1);
    expect(restored[0]?.id).not.toBe(first.id);
    // And the rename survives untouched beside it.
    expect(doc.starterKit.moods.some((m) => m.name === "mi ánimo")).toBe(true);
  });

  it("wires added loops to moods by id, so the document still validates", () => {
    const doc = topUp(smallProject());
    const moodIds = new Set(doc.starterKit.moods.map((m) => m.id));
    for (const loop of doc.starterKit.loops) {
      for (const step of loop.steps) expect(moodIds.has(step.moodId)).toBe(true);
    }
    expect(validateDocument(doc).ok).toBe(true);
  });

  it("reuses the moods already present rather than duplicating them", () => {
    const base = smallProject();
    const kept = base.starterKit.moods.map((m) => m.id);
    const doc = topUp(base);
    const names = doc.starterKit.moods.map((m) => m.name);
    expect(new Set(names).size).toBe(names.length);
    // The originals keep their ids, so loops that referenced them still work.
    expect(doc.starterKit.moods.slice(0, kept.length).map((m) => m.id)).toEqual(
      kept,
    );
  });

  it("is a no-op the second time, so the affordance disappears once used", () => {
    const once = topUp(smallProject());
    const twice = topUp(once);
    expect(twice.starterKit).toEqual(once.starterKit);
  });
  it("tops up the shared starter kit for a bubble that inherits it", () => {
    const base = smallProject();
    const two = ok(addBubble(base, "Second"));
    const doc = ok(topUpLibrary(two, activeOf(two)));
    // The other inheriting bubble gains the content too, and neither bubble
    // was forked into a private kit behind the user's back (docs/03 §5).
    expect(doc.bubbles.every((b) => b.ownKit === null)).toBe(true);
    expect(libraryGap(doc.starterKit)).toEqual({ moods: 0, loops: 0 });
  });

  it("tops up only the private kit of a bubble that owns one", () => {
    const base = smallProject();
    const two = ok(addBubble(base, "Second"));
    const second = two.bubbles[1];
    if (!second) throw new Error("fixture missing second bubble");
    // The first behaviour edit forks the starter kit into ownKit.
    const forked = ok(addMood(two, second.id, "propio"));
    const doc = ok(topUpLibrary(forked, second.id));
    expect(libraryGap(doc.bubbles[1]?.ownKit ?? { moods: [], loops: [] })).toEqual(
      { moods: 0, loops: 0 },
    );
    // The shared kit is untouched, so the other bubble is unaffected.
    expect(doc.starterKit).toEqual(forked.starterKit);
  });

  it("refuses a bubble the document does not hold", () => {
    expect(topUpLibrary(smallProject(), "bbl_nope").ok).toBe(false);
  });

  it("topUpKit is the pure core both paths share", () => {
    const kit = smallProject().starterKit;
    expect(libraryGap(topUpKit(kit))).toEqual({ moods: 0, loops: 0 });
  });
});
