// Migration policy (docs/03 §8).
import { describe, expect, it } from "vitest";
import { migrate } from "./migrate";
import { createDefaultDocument } from "./create";
import { libraryGap } from "./library";
import type { Kit } from "./types";

describe("migrate", () => {
  it("passes through a valid v2 document (cloned)", () => {
    const doc = createDefaultDocument();
    const r = migrate(doc);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.doc).toEqual(doc);
      expect(r.doc).not.toBe(doc);
    }
  });

  // FR-2.6 landed in v2. A v1 surface predates the shape family, so it joins
  // v2 on "round" — the one family whose outline is byte-identical to what v1
  // already rendered, which is why the goldens do not move.
  it("migrates a v1 document by defaulting every surface to round", () => {
    const doc = createDefaultDocument() as unknown as Record<string, unknown>;
    const v1 = structuredClone(doc);
    v1.version = 1;
    for (const b of v1.bubbles as {
      body: { surface: Record<string, unknown> };
    }[]) {
      delete b.body.surface.shape;
    }

    const r = migrate(v1);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.doc.version).toBe(5);
    for (const b of r.doc.bubbles) {
      expect(b.body.surface.shape).toBe("round");
    }
  });

  it("does not mutate the input it migrates", () => {
    const doc = createDefaultDocument() as unknown as Record<string, unknown>;
    const v1 = structuredClone(doc);
    v1.version = 1;
    for (const b of v1.bubbles as {
      body: { surface: Record<string, unknown> };
    }[]) {
      delete b.body.surface.shape;
    }
    migrate(v1);
    expect(v1.version).toBe(1);
  });

  it("rejects future versions with E_VERSION", () => {
    const r = migrate({ version: 6 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("E_VERSION");
  });

  it("rejects a version-1 husk with no bubbles as E_INVALID, not a throw", () => {
    const r = migrate({ version: 1 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("E_INVALID");
  });

  it("rejects non-objects", () => {
    const r = migrate("nope");
    expect(r.ok).toBe(false);
  });
  // FR-2.2 gave the surface an authored depth in v3. A v2 surface predates it,
  // so it joins v3 on `min(width, height) * 0.85` — exactly the depth radius
  // the projection used to derive for itself, which is why no saved character
  // changes shape and the render goldens do not move.
  it("migrates a v2 document by writing the depth it used to derive", () => {
    const doc = createDefaultDocument() as unknown as Record<string, unknown>;
    const v2 = structuredClone(doc);
    v2.version = 2;
    for (const b of v2.bubbles as {
      body: { surface: Record<string, unknown> };
    }[]) {
      delete b.body.surface.depth;
    }

    const r = migrate(v2);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.doc.version).toBe(5);
    for (const b of r.doc.bubbles) {
      const s = b.body.surface;
      expect(s.depth).toBeCloseTo(Math.min(s.width, s.height) * 0.85, 10);
    }
  });

  it("leaves a depth that is already authored alone", () => {
    const doc = createDefaultDocument() as unknown as Record<string, unknown>;
    const v2 = structuredClone(doc);
    v2.version = 2;
    for (const b of v2.bubbles as {
      body: { surface: Record<string, unknown> };
    }[]) {
      b.body.surface.depth = 42;
    }

    const r = migrate(v2);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.doc.bubbles[0]?.body.surface.depth).toBe(42);
  });

  it("still migrates a v1 document all the way to v5", () => {
    const doc = createDefaultDocument() as unknown as Record<string, unknown>;
    const v1 = structuredClone(doc);
    v1.version = 1;
    for (const b of v1.bubbles as {
      body: { surface: Record<string, unknown> };
    }[]) {
      delete b.body.surface.shape;
      delete b.body.surface.depth;
    }

    const r = migrate(v1);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.doc.version).toBe(5);
    expect(r.doc.bubbles[0]?.body.surface.shape).toBe("round");
    expect(r.doc.bubbles[0]?.body.surface.depth).toBeGreaterThan(0);
  });
  // FR-2.3 gave every assembled primitive a depth in v4. A v3 extra predates
  // it, so it joins v4 on the thickness the renderer effectively assumed when
  // it drew extras as flat shapes riding the surface.
  it("migrates a v3 document by giving every extra a depth", () => {
    const doc = createDefaultDocument() as unknown as Record<string, unknown>;
    const v3 = structuredClone(doc);
    v3.version = 3;
    const bubbles = v3.bubbles as {
      body: { extras: Record<string, unknown>[] };
    }[];
    const first = bubbles[0];
    if (!first) throw new Error("fixture needs a bubble");
    first.body.extras = [
      {
        id: "ext_a",
        kind: "circle",
        width: 60,
        height: 40,
        roundness: 1,
        x: 0,
        y: 0,
        rotationDeg: 0,
        z: 0,
        colorRole: "accent",
        color: "#8be9ff",
      },
    ];

    const r = migrate(v3);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.doc.version).toBe(5);
    expect(r.doc.bubbles[0]?.body.extras[0]?.depth).toBeCloseTo(40 * 0.85, 10);
  });
});

// FR-4.7/FR-5.7: the starter library grew after v4 shipped, and a project
// saved before it kept the kit it was saved with — leaving a returning user
// short of content, and staring at a top-up row on the Moods panel every time
// they opened it. v5 carries the top-up so the moods are simply there.
describe("migrate · v4 -> v5 tops the kit up to the starter library", () => {
  const thinned = (): Record<string, unknown> => {
    const doc = createDefaultDocument();
    const v4 = structuredClone(doc) as unknown as Record<string, unknown>;
    v4.version = 4;
    // A project saved when the library held four moods and two loops.
    v4.starterKit = {
      moods: doc.starterKit.moods.slice(0, 4),
      loops: doc.starterKit.loops.slice(0, 2),
    };
    return v4;
  };

  it("leaves no gap against the current library", () => {
    const r = migrate(thinned());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.doc.version).toBe(5);
    expect(libraryGap(r.doc.starterKit)).toEqual({ moods: 0, loops: 0 });
  });

  it("keeps every mood the project already had, by id", () => {
    const before = thinned();
    const kept = (before.starterKit as Kit).moods.map((m) => m.id);
    const r = migrate(before);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const ids = r.doc.starterKit.moods.map((m) => m.id);
    expect(ids.slice(0, kept.length)).toEqual(kept);
  });

  it("does not overwrite a mood the user renamed", () => {
    const before = thinned();
    const kit = before.starterKit as Kit;
    kit.moods[0] = { ...kit.moods[0], name: "Mi ánimo" };
    const r = migrate(before);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const renamed = r.doc.starterKit.moods.filter((m) => m.name === "Mi ánimo");
    expect(renamed).toHaveLength(1);
    // The library entry it was renamed from comes back beside it, never over it.
    expect(libraryGap(r.doc.starterKit)).toEqual({ moods: 0, loops: 0 });
  });

  it("tops up a bubble that owns its kit, not only the shared one", () => {
    const before = thinned();
    const bubbles = before.bubbles as { ownKit: Kit | null }[];
    bubbles[0].ownKit = structuredClone(before.starterKit) as Kit;
    const r = migrate(before);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const own = r.doc.bubbles[0].ownKit;
    expect(own).not.toBeNull();
    if (!own) return;
    expect(libraryGap(own)).toEqual({ moods: 0, loops: 0 });
  });

  // The reason the top-up runs on the way in from v4 and never again: a
  // document already at v5 has had it, so a mood the user has since deleted
  // must not come back on the next load.
  it("leaves a v5 document alone, so a deleted mood stays deleted", () => {
    const doc = createDefaultDocument();
    const [gone] = doc.starterKit.moods;
    expect(gone).toBeDefined();
    if (!gone) return;

    // Every starter mood is used by some loop, and deleting one a loop still
    // points at is E_REF (FR-5.6) — a different rule. So the loops go too,
    // which is exactly what the Moods panel's delete flow does.
    const trimmed = {
      ...doc,
      starterKit: {
        moods: doc.starterKit.moods.filter((m) => m.id !== gone.id),
        loops: doc.starterKit.loops.filter(
          (l) => !l.steps.some((s) => s.moodId === gone.id),
        ),
      },
    };
    const r = migrate(trimmed);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.doc.starterKit.moods).toHaveLength(
      doc.starterKit.moods.length - 1,
    );
    expect(r.doc.starterKit.moods.some((m) => m.name === gone.name)).toBe(
      false,
    );
  });
});
