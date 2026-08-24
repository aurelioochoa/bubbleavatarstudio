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
    expect(r.doc.version).toBe(2);
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
    const r = migrate({ version: 3 });
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
});
