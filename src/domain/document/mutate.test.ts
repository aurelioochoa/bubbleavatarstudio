// FR-1..FR-5 mutation semantics incl. kit copy-on-write (docs/03 §5), and
// with them the one the range would otherwise bury: a duplicate is a deep copy
// carrying fresh ids (FR-1.3). A loop's mode is committed here too (FR-5.3);
// what each mode then *does* is playback.test.ts's. `springSpeed` is stored
// here and has no effect anywhere else — see docs/08 "Open", which is a
// defect, not a scope line.
import { describe, expect, it } from "vitest";
import { createDefaultDocument } from "./create";
import {
  addBubble,
  addExtra,
  addLoop,
  addMood,
  addStep,
  duplicateBubble,
  duplicateLoop,
  duplicateMood,
  effectiveKit,
  freshDocument,
  removeBubble,
  removeExtra,
  removeLoop,
  removeMood,
  renameBubble,
  reorderBubbles,
  reorderMoods,
  reorderSteps,
  resetKit,
  setActiveBubble,
  setLinked,
  setSpacing,
  updateAmbient,
  updateColors,
  updateEyePlacement,
  updateEyeShape,
  updateExtra,
  updateLoop,
  updateMood,
  updateStep,
  updateSurface,
} from "./mutate";
import { validateDocument } from "./validate";
import type { Random } from "../ids";
import type { StudioDocument } from "./types";

const seedRandom = (): Random => {
  // Non-degenerate sequence: newId consumes 10 draws per id, so a short
  // period would make every generated id identical.
  let i = 7;
  return () => (i = (i * 37 + 11) % 1000) / 1000;
};

const doc0 = () => createDefaultDocument();

const kitOf = (doc: StudioDocument, bubbleId: string) => {
  const b = doc.bubbles.find((x) => x.id === bubbleId);
  if (!b) throw new Error("missing bubble");
  return effectiveKit(b, doc);
};

const unwrap = (
  r:
    | { ok: true; doc: StudioDocument }
    | { ok: false; code: string; detail: string },
) => {
  expect(r.ok).toBe(true);
  if (r.ok) return r.doc;
  throw new Error(r.detail);
};

const err = (r: { ok: boolean; code?: string }) => {
  expect(r.ok).toBe(false);
  return r.code;
};

describe("FR-1 bubble CRUD", () => {
  it("adds a bubble with unique id and activates it", () => {
    const doc = unwrap(addBubble(doc0(), "Pip", { random: seedRandom() }));
    expect(doc.bubbles).toHaveLength(2);
    expect(doc.activeBubbleId).toBe(doc.bubbles[1].id);
    expect(validateDocument(doc).ok).toBe(true);
  });

  it("renames with trimming and rejects blank names", () => {
    const b0 = doc0();
    expect(
      unwrap(renameBubble(b0, b0.bubbles[0].id, " Nova ")).bubbles[0].name,
    ).toBe("Nova");
    expect(err(renameBubble(b0, b0.bubbles[0].id, "  "))).toBe("E_NOT_FOUND");
  });

  it("duplicates with a copied own kit", () => {
    const base = doc0();
    const doc = unwrap(duplicateBubble(base, base.bubbles[0].id));
    expect(doc.bubbles).toHaveLength(2);
    expect(doc.bubbles[1].ownKit).not.toBeNull();
    expect(doc.bubbles[1].ownKit?.moods.map((m) => m.id)).toEqual(
      base.starterKit.moods.map((m) => m.id),
    );
  });

  it("removes and re-targets the active bubble", () => {
    const base = unwrap(addBubble(doc0(), "B"));
    const target = base.activeBubbleId;
    if (!target) throw new Error("active bubble missing");
    const doc = unwrap(removeBubble(base, target));
    expect(doc.bubbles.map((b) => b.name)).toEqual(["Bubble"]);
    expect(doc.activeBubbleId).toBe(doc.bubbles[0].id);
  });

  it("setActiveBubble errors on unknown id", () => {
    expect(err(setActiveBubble(doc0(), "nope"))).toBe("E_NOT_FOUND");
  });

  it("mutations never mutate the input document", () => {
    const base = doc0();
    unwrap(renameBubble(base, base.bubbles[0].id, "X"));
    expect(base.bubbles[0].name).toBe("Bubble");
  });

  it("reorders bubbles and keeps the active selection (FR-1.4)", () => {
    const base = unwrap(addBubble(doc0(), "Two"));
    const first = base.bubbles[0].id;
    const second = base.bubbles[1].id;
    const doc = unwrap(reorderBubbles(base, [second, first]));
    expect(doc.bubbles.map((b) => b.id)).toEqual([second, first]);
    expect(doc.activeBubbleId).toBe(base.activeBubbleId);
    expect(validateDocument(doc).ok).toBe(true);
    expect(err(reorderBubbles(base, [first]))).toBe("E_NOT_FOUND");
    expect(err(reorderBubbles(base, [first, "nope"]))).toBe("E_NOT_FOUND");
  });
});

describe("FR-2 body, extras, colors", () => {
  it("patches the surface", () => {
    const base = doc0();
    const doc = unwrap(
      updateSurface(base, base.bubbles[0].id, {
        roundness: 0.4,
        rotationDeg: 10,
      }),
    );
    expect(doc.bubbles[0].body.surface.roundness).toBe(0.4);
    expect(doc.bubbles[0].body.surface.rotationDeg).toBe(10);
  });

  it("adds, updates and removes extras", () => {
    const base = doc0();
    const withExtra = unwrap(
      addExtra(base, base.bubbles[0].id, {
        kind: "ring",
        width: 40,
        height: 40,
        depth: 40,
        roundness: 1,
        x: 0,
        y: -60,
        rotationDeg: 0,
        z: 2,
        colorRole: "accent",
        color: "#ffffff",
      }),
    );
    const ext = withExtra.bubbles[0].body.extras[0];
    expect(ext.kind).toBe("ring");
    const updated = unwrap(
      updateExtra(withExtra, withExtra.bubbles[0].id, ext.id, { z: 5 }),
    );
    expect(updated.bubbles[0].body.extras[0].z).toBe(5);
    const removed = unwrap(removeExtra(updated, updated.bubbles[0].id, ext.id));
    expect(removed.bubbles[0].body.extras).toHaveLength(0);
  });

  it("patches colors", () => {
    const base = doc0();
    const doc = unwrap(
      updateColors(base, base.bubbles[0].id, { body: "#ff8ac2" }),
    );
    expect(doc.bubbles[0].colors.body).toBe("#ff8ac2");
  });
});

describe("FR-3 eyes with mirroring", () => {
  it("linked editing mirrors the other side", () => {
    const base = doc0();
    const doc = unwrap(
      updateEyePlacement(base, base.bubbles[0].id, "left", {
        offsetX: -20,
        rotationDeg: 8,
      }),
    );
    expect(doc.bubbles[0].restingFace.left.offsetX).toBe(-20);
    expect(doc.bubbles[0].restingFace.right.offsetX).toBe(20);
    expect(doc.bubbles[0].restingFace.right.rotationDeg).toBe(-8);
    expect(validateDocument(doc).ok).toBe(true);
  });

  it("unlinked editing leaves the other side untouched", () => {
    const base = doc0();
    const unlinked = unwrap(setLinked(base, base.bubbles[0].id, false));
    const doc = unwrap(
      updateEyePlacement(unlinked, unlinked.bubbles[0].id, "left", {
        offsetY: 9,
      }),
    );
    expect(doc.bubbles[0].restingFace.right.offsetY).toBe(0);
    expect(doc.bubbles[0].restingFace.left.offsetY).toBe(9);
  });

  it("updates eye shape and spacing", () => {
    const base = doc0();
    const doc = unwrap(
      setSpacing(
        unwrap(updateEyeShape(base, base.bubbles[0].id, { height: 60 })),
        base.bubbles[0].id,
        80,
      ),
    );
    expect(doc.bubbles[0].restingFace.eye.height).toBe(60);
    expect(doc.bubbles[0].restingFace.spacing).toBe(80);
  });
});

describe("FR-4/FR-5 kit copy-on-write", () => {
  it("first behavior edit forks the starter kit atomically", () => {
    const base = doc0();
    const doc = unwrap(
      addMood(base, base.bubbles[0].id, "wink", { random: seedRandom() }),
    );
    const kit = kitOf(doc, doc.bubbles[0].id);
    expect(doc.bubbles[0].ownKit).not.toBeNull();
    expect(kit.moods.map((m) => m.id)).toEqual([
      ...base.starterKit.moods.map((m) => m.id),
      expect.any(String),
    ]);
    expect(kit.loops).toEqual(base.starterKit.loops); // loops come along in the same atomic clone
  });

  it("starter kit stays untouched after a fork", () => {
    const base = doc0();
    const doc = unwrap(
      addMood(base, base.bubbles[0].id, "wink", { random: seedRandom() }),
    );
    expect(doc.starterKit.moods).toHaveLength(base.starterKit.moods.length);
    expect(validateDocument(doc).ok).toBe(true);
  });

  it("updating a mood forks too", () => {
    const base = doc0();
    const doc = unwrap(
      updateMood(base, base.bubbles[0].id, base.starterKit.moods[0].id, {
        left: { scaleY: 0.3 },
      }),
    );
    expect(doc.bubbles[0].ownKit?.moods[0].left.scaleY).toBe(0.3);
    expect(base.starterKit.moods[0].left.scaleY).not.toBe(0.3);
  });

  it("unknown mood/loop/bubble ids return E_NOT_FOUND", () => {
    const base = doc0();
    expect(err(updateMood(base, base.bubbles[0].id, "ghost", {}))).toBe(
      "E_NOT_FOUND",
    );
    expect(
      err(updateMood(base, "ghost", base.starterKit.moods[0].id, {})),
    ).toBe("E_NOT_FOUND");
    expect(err(updateLoop(base, base.bubbles[0].id, "ghost", {}))).toBe(
      "E_NOT_FOUND",
    );
  });
});

describe("FR-5 loops", () => {
  it("add/update/remove loops", () => {
    const base = doc0();
    const withLoop = unwrap(
      addLoop(
        base,
        base.bubbles[0].id,
        { name: "bounce", mode: "pingpong" },
        { random: seedRandom() },
      ),
    );
    const loop = withLoop.bubbles[0].ownKit?.loops.find(
      (l) => l.name === "bounce",
    );
    expect(loop?.mode).toBe("pingpong");
    const updated = unwrap(
      updateLoop(withLoop, withLoop.bubbles[0].id, loop?.id ?? "", {
        springSpeed: 2,
      }),
    );
    expect(
      kitOf(updated, updated.bubbles[0].id).loops.find((l) => l.id === loop?.id)
        ?.springSpeed,
    ).toBe(2);
    const removed = unwrap(
      removeLoop(updated, updated.bubbles[0].id, loop?.id ?? ""),
    );
    expect(
      kitOf(removed, removed.bubbles[0].id).loops.some(
        (l) => l.id === loop?.id,
      ),
    ).toBe(false);
  });

  // FR-5.10: a mood dragged onto the sequence lands where it was dropped, not
  // at the end. The index is where the new step ends up, counted before it is
  // inserted, so dropping "at 0" puts it first.
  it("inserts a step at the index it is given", () => {
    const base = doc0();
    const bubbleId = base.bubbles[0].id;
    const loopId = base.starterKit.loops[0].id;
    const moodId = base.starterKit.moods[3].id;
    const before = kitOf(base, bubbleId).loops[0].steps.map((s) => s.moodId);
    const after = unwrap(
      addStep(
        base,
        bubbleId,
        loopId,
        { moodId, holdMs: 500, transition: "ease" },
        { random: seedRandom() },
        1,
      ),
    );
    const steps = kitOf(after, bubbleId).loops[0].steps.map((s) => s.moodId);
    expect(steps).toEqual([before[0], moodId, ...before.slice(1)]);
  });

  it("appends when no index is given, as it always did", () => {
    const base = doc0();
    const bubbleId = base.bubbles[0].id;
    const loopId = base.starterKit.loops[0].id;
    const moodId = base.starterKit.moods[3].id;
    const after = unwrap(
      addStep(
        base,
        bubbleId,
        loopId,
        { moodId, holdMs: 500, transition: "ease" },
        { random: seedRandom() },
      ),
    );
    expect(kitOf(after, bubbleId).loops[0].steps.at(-1)?.moodId).toBe(moodId);
  });

  it("clamps an index past either end rather than dropping the step", () => {
    // A drop at the far right of the strip is one past the last chip, and a
    // drag that leaves the strip entirely reports a negative index.
    const base = doc0();
    const bubbleId = base.bubbles[0].id;
    const loopId = base.starterKit.loops[0].id;
    const moodId = base.starterKit.moods[3].id;
    const insert = (at: number) =>
      kitOf(
        unwrap(
          addStep(
            base,
            bubbleId,
            loopId,
            { moodId, holdMs: 500, transition: "ease" },
            { random: seedRandom() },
            at,
          ),
        ),
        bubbleId,
      ).loops[0].steps;
    expect(insert(99).at(-1)?.moodId).toBe(moodId);
    expect(insert(-4).at(0)?.moodId).toBe(moodId);
  });

  it("steps reference moods by id; unknown mood is E_REF", () => {
    const base = doc0();
    const moodId = base.starterKit.moods[0].id;
    const withStep = unwrap(
      addStep(
        base,
        base.bubbles[0].id,
        base.starterKit.loops[0].id,
        {
          moodId,
          holdMs: 500,
          transition: "step",
        },
        { random: seedRandom() },
      ),
    );
    const loop = kitOf(withStep, withStep.bubbles[0].id).loops[0];
    expect(loop.steps.at(-1)?.moodId).toBe(moodId);
    expect(
      err(
        addStep(base, base.bubbles[0].id, base.starterKit.loops[0].id, {
          moodId: "ghost",
          holdMs: 100,
          transition: "ease",
        }),
      ),
    ).toBe("E_REF");
  });

  it("deleting a mood referenced by a loop is blocked with E_REF", () => {
    const base = doc0();
    const moodId = base.starterKit.loops[0].steps[0].moodId;
    const r = removeMood(base, base.bubbles[0].id, moodId);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("E_REF");
  });

  it("deleting an unreferenced mood works", () => {
    const base = doc0();
    const withMood = unwrap(
      addMood(base, base.bubbles[0].id, "wink", { random: seedRandom() }),
    );
    const added = kitOf(withMood, withMood.bubbles[0].id).moods.at(-1);
    if (!added) throw new Error("mood not added");
    const doc = unwrap(removeMood(withMood, withMood.bubbles[0].id, added.id));
    expect(
      kitOf(doc, doc.bubbles[0].id).moods.some((m) => m.id === added.id),
    ).toBe(false);
  });

  it("update and reorder steps", () => {
    const base = doc0();
    const loopId = base.starterKit.loops[0].id;
    const steps = base.starterKit.loops[0].steps;
    const reordered = unwrap(
      reorderSteps(base, base.bubbles[0].id, loopId, [
        steps[1].id,
        steps[0].id,
      ]),
    );
    expect(
      kitOf(reordered, reordered.bubbles[0].id).loops[0].steps.map((s) => s.id),
    ).toEqual([steps[1].id, steps[0].id]);
    const updated = unwrap(
      updateStep(reordered, reordered.bubbles[0].id, loopId, steps[0].id, {
        holdMs: 42,
      }),
    );
    expect(kitOf(updated, updated.bubbles[0].id).loops[0].steps[1].holdMs).toBe(
      42,
    );
  });

  it("duplicates a mood with a fresh id, suffixed name, forking the kit (FR-4.2)", () => {
    const base = doc0();
    const bid = base.bubbles[0].id;
    const happy = base.starterKit.moods[0];
    const doc = unwrap(
      duplicateMood(base, bid, happy.id, { random: seedRandom() }),
    );
    const moods = kitOf(doc, bid).moods;
    const copy = moods.find((m) => m.name === "happy copy");
    if (!copy) throw new Error("happy copy missing");
    expect(copy.id).not.toBe(happy.id);
    expect(moods.findIndex((m) => m.id === copy.id)).toBe(
      moods.findIndex((m) => m.id === happy.id) + 1,
    );
    expect(doc.bubbles[0].ownKit).not.toBeNull();
    expect(validateDocument(doc).ok).toBe(true);
    expect(err(duplicateMood(base, bid, "nope"))).toBe("E_NOT_FOUND");
  });

  it("reorders moods (FR-4.2)", () => {
    const base = doc0();
    const bid = base.bubbles[0].id;
    const ids = base.starterKit.moods.map((m) => m.id);
    // permute() demands the complete id array, so move the last mood to the
    // front rather than naming a fixed handful.
    const moved = [ids[ids.length - 1], ...ids.slice(0, -1)];
    const doc = unwrap(reorderMoods(base, bid, moved));
    expect(kitOf(doc, bid).moods.map((m) => m.id)).toEqual(moved);
    expect(validateDocument(doc).ok).toBe(true);
  });

  it("duplicates a loop with fresh loop and step ids, keeping mood refs (FR-5.2)", () => {
    const base = doc0();
    const bid = base.bubbles[0].id;
    const greet = base.starterKit.loops[1];
    const doc = unwrap(
      duplicateLoop(base, bid, greet.id, { random: seedRandom() }),
    );
    const copy = kitOf(doc, bid).loops.find((l) => l.name === "greet copy");
    if (!copy) throw new Error("greet copy missing");
    expect(copy.id).not.toBe(greet.id);
    expect(copy.steps.map((s) => s.id)).not.toEqual(
      greet.steps.map((s) => s.id),
    );
    expect(copy.steps.map((s) => s.moodId)).toEqual(
      greet.steps.map((s) => s.moodId),
    );
    expect(validateDocument(doc).ok).toBe(true);
    expect(err(duplicateLoop(base, bid, "nope"))).toBe("E_NOT_FOUND");
  });
});

describe("ambient + reset", () => {
  it("patches ambient config", () => {
    const base = doc0();
    const doc = unwrap(
      updateAmbient(base, base.bubbles[0].id, { enabled: false }),
    );
    expect(doc.bubbles[0].ambient.enabled).toBe(false);
  });

  it("resetKit returns a bubble to the starter kit", () => {
    const seed = doc0();
    const base = unwrap(
      addMood(seed, seed.bubbles[0].id, "wink", { random: seedRandom() }),
    );
    const doc = unwrap(resetKit(base, base.bubbles[0].id));
    expect(doc.bubbles[0].ownKit).toBeNull();
    expect(kitOf(doc, doc.bubbles[0].id).moods).toHaveLength(
      doc.starterKit.moods.length,
    );
  });

  it("freshDocument produces a valid default document", () => {
    expect(validateDocument(freshDocument()).ok).toBe(true);
  });
});
