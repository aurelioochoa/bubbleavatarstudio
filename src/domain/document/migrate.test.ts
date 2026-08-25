// Migration policy (docs/03 §8).
import { describe, expect, it } from "vitest";
import { migrate } from "./migrate";
import { createDefaultDocument } from "./create";

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
    expect(r.doc.version).toBe(3);
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
    const r = migrate({ version: 4 });
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
    expect(r.doc.version).toBe(3);
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

  it("still migrates a v1 document all the way to v3", () => {
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
    expect(r.doc.version).toBe(3);
    expect(r.doc.bubbles[0]?.body.surface.shape).toBe("round");
    expect(r.doc.bubbles[0]?.body.surface.depth).toBeGreaterThan(0);
  });
});
