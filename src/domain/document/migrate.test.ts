// Migration policy (docs/03 §8).
import { describe, expect, it } from "vitest";
import { migrate } from "./migrate";
import { createDefaultDocument } from "./create";

describe("migrate", () => {
  it("passes through a valid v1 document (cloned)", () => {
    const doc = createDefaultDocument();
    const r = migrate(doc);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.doc).toEqual(doc);
      expect(r.doc).not.toBe(doc);
    }
  });

  it("rejects future versions with E_VERSION", () => {
    const r = migrate({ version: 2 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("E_VERSION");
  });

  it("rejects invalid v1 documents with E_INVALID", () => {
    const r = migrate({ version: 1 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("E_INVALID");
  });

  it("rejects non-objects", () => {
    const r = migrate("nope");
    expect(r.ok).toBe(false);
  });
});
