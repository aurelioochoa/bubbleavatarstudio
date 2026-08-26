// FR-11 validation coverage of all error codes (docs/03 §7), including the
// invariant no type can hold on its own: the active bubble is one that exists,
// or none at all (FR-1.6).
import { describe, expect, it } from "vitest";
import { validateDocument } from "./validate";
import { createDefaultDocument } from "./create";
import type { StudioDocument } from "./types";
import full from "../../test/fixtures/full.json";
import minimal from "../../test/fixtures/minimal.json";

const clone = () => structuredClone(full) as StudioDocument;

function codes(doc: unknown): string[] {
  const r = validateDocument(doc);
  expect(r.ok).toBe(false);
  if (!r.ok) return r.issues.map((i) => i.code);
  throw new Error("unreachable");
}

describe("validateDocument — valid documents", () => {
  it("accepts the fixtures (FR-11)", () => {
    expect(validateDocument(minimal)).toEqual({ ok: true });
    expect(validateDocument(full)).toEqual({ ok: true });
    expect(validateDocument(clone())).toEqual({ ok: true });
  });

  it("rejects non-objects with E_SHAPE at root", () => {
    expect(validateDocument(null)).toEqual({
      ok: false,
      issues: [{ code: "E_SHAPE", path: "$" }],
    });
  });
});

describe("validateDocument — version and kind", () => {
  it("fails E_VERSION on wrong version", () => {
    const doc = clone();
    (doc as { version: number }).version = 7;
    expect(codes(doc)).toContain("E_VERSION");
  });

  it("fails E_KIND on wrong kind", () => {
    const doc = clone();
    (doc as { kind: string }).kind = "other";
    expect(codes(doc)).toContain("E_KIND");
  });
});

describe("validateDocument — identifiers and references", () => {
  it("fails E_ID_DUP on duplicated bubble ids", () => {
    const doc = clone();
    doc.bubbles[1].id = doc.bubbles[0].id;
    expect(codes(doc)).toContain("E_ID_DUP");
  });

  it("fails E_REF when activeBubbleId is unknown", () => {
    const doc = clone();
    doc.activeBubbleId = "nope";
    expect(codes(doc)).toContain("E_REF");
  });

  it("fails E_REF when a step references an unknown mood", () => {
    const doc = clone();
    doc.starterKit.loops[0].steps[0].moodId = "ghost";
    expect(codes(doc)).toContain("E_REF");
  });

  it("fails E_REF inside an ownKit too", () => {
    const doc = clone();
    const kit = doc.bubbles[0].ownKit;
    if (!kit) throw new Error("fixture ownKit missing");
    kit.loops[0].steps[0].moodId = "ghost";
    expect(codes(doc)).toContain("E_REF");
  });
});

describe("validateDocument — ranges, names, colors, shapes", () => {
  // FR-2.6 / FR-2.7 (docs/03 §7.3).
  it("fails E_SHAPE on an unknown shape family", () => {
    const doc = clone();
    (doc.bubbles[0].body.surface as { shape: string }).shape = "hexagon";
    expect(codes(doc)).toContain("E_SHAPE");
  });

  it("accepts the organic parameters in range", () => {
    const doc = clone();
    const s = doc.bubbles[0].body.surface;
    s.shape = "organic";
    s.lobes = 5;
    s.wobble = 0.4;
    s.seed = 12;
    expect(validateDocument(doc)).toEqual({ ok: true });
  });

  it("treats the organic parameters as optional", () => {
    const doc = clone();
    doc.bubbles[0].body.surface.shape = "organic";
    expect(validateDocument(doc)).toEqual({ ok: true });
  });

  it("fails E_RANGE on organic parameters out of range", () => {
    const tooManyLobes = clone();
    tooManyLobes.bubbles[0].body.surface.lobes = 99;
    expect(codes(tooManyLobes)).toContain("E_RANGE");

    const tooMuchWobble = clone();
    tooMuchWobble.bubbles[0].body.surface.wobble = 1.5;
    expect(codes(tooMuchWobble)).toContain("E_RANGE");
  });

  it("fails E_RANGE on a non-integer seed", () => {
    const doc = clone();
    doc.bubbles[0].body.surface.seed = 1.5;
    expect(codes(doc)).toContain("E_RANGE");
  });

  it("fails E_RANGE on out-of-range surface roundness", () => {
    const doc = clone();
    doc.bubbles[0].body.surface.roundness = 1.5;
    expect(codes(doc)).toContain("E_RANGE");
  });

  it("fails E_RANGE on non-positive width", () => {
    const doc = clone();
    doc.bubbles[0].body.surface.width = 0;
    expect(codes(doc)).toContain("E_RANGE");
  });

  it("fails E_RANGE when blink min > max", () => {
    const doc = clone();
    doc.starterKit.loops[0].blink = {
      enabled: true,
      minIntervalMs: 5000,
      maxIntervalMs: 1000,
      durationMs: 120,
    };
    expect(codes(doc)).toContain("E_RANGE");
  });

  it("fails E_NAME on blank bubble name", () => {
    const doc = clone();
    doc.bubbles[0].name = "   ";
    expect(codes(doc)).toContain("E_NAME");
  });

  it("fails E_COLOR on a non-hex color", () => {
    const doc = clone();
    doc.bubbles[0].colors.body = "red";
    expect(codes(doc)).toContain("E_COLOR");
  });

  it("fails E_SHAPE on a bad transition style", () => {
    const doc = clone();
    (doc.starterKit.loops[0].steps[0] as { transition: string }).transition =
      "bounce";
    expect(codes(doc)).toContain("E_SHAPE");
  });

  it("fails E_SHAPE on a bad locale", () => {
    const doc = clone();
    (doc as { locale: string }).locale = "fr";
    expect(codes(doc)).toContain("E_SHAPE");
  });
});

describe("validateDocument — eye mirroring (FR-3)", () => {
  it("fails E_MIRROR when linked eyes are not mirrored", () => {
    const doc = clone();
    doc.bubbles[0].restingFace.right.offsetX = 40; // left is -6
    expect(codes(doc)).toContain("E_MIRROR");
  });

  it("allows asymmetric eyes when unlinked", () => {
    const doc = clone();
    expect(validateDocument(doc)).toEqual({ ok: true });
  });
});

/**
 * docs/07 §4: one on-disk document per validation rule, kept beside the two
 * valid fixtures. The filename carries the code the document must fail with —
 * `E_REF.step-mood-missing.json` — so a new case needs no edit here, and the
 * roster below fails loudly if a code ever ships without one.
 */
describe("invalid fixtures (docs/07 §4)", () => {
  const files = import.meta.glob<{ default: unknown }>(
    "../../test/fixtures/invalid/*.json",
    { eager: true },
  );

  const cases = Object.entries(files).map(([path, mod]) => {
    const file = path.split("/").pop() ?? path;
    return { file, code: file.split(".")[0] ?? "", doc: mod.default };
  });

  /** Mirrors the ErrorCode union in validate.ts. */
  const CODES = [
    "E_VERSION",
    "E_KIND",
    "E_SHAPE",
    "E_ID_DUP",
    "E_REF",
    "E_RANGE",
    "E_NAME",
    "E_COLOR",
    "E_MIRROR",
  ];

  it("covers every error code the validator can emit", () => {
    expect([...new Set(cases.map((c) => c.code))].sort()).toEqual(
      [...CODES].sort(),
    );
  });

  it.each(cases)("$file fails with $code", ({ code, doc }) => {
    expect(codes(doc)).toContain(code);
  });

  it("breaks exactly one rule each, so the code named is the whole story", () => {
    for (const c of cases) {
      const r = validateDocument(c.doc);
      expect(r.ok).toBe(false);
      if (r.ok) continue;
      expect([...new Set(r.issues.map((i) => i.code))]).toEqual([c.code]);
    }
  });
});

// FR-2.3: a body is a primary shape plus assembled primitives, and the count is
// bounded so "assembled" stays a construction rather than a scene graph.
describe("assembled primitives are capped (FR-2.3)", () => {
  const withExtras = (n: number) => {
    const doc = createDefaultDocument();
    const b = doc.bubbles[0];
    if (!b) throw new Error("fixture needs a bubble");
    b.body.extras = Array.from({ length: n }, (_, i) => ({
      id: `ext_${String(i)}`,
      kind: "circle" as const,
      width: 40,
      height: 40,
      depth: 34,
      roundness: 1,
      x: 0,
      y: 0,
      rotationDeg: 0,
      z: i,
      colorRole: "accent" as const,
      color: "#8be9ff",
    }));
    return doc;
  };

  it("accepts sixteen", () => {
    expect(validateDocument(withExtras(16)).ok).toBe(true);
  });

  it("rejects seventeen with E_RANGE", () => {
    const r = validateDocument(withExtras(17));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues.map((i) => i.code)).toContain("E_RANGE");
  });

  it("requires a depth on every one of them", () => {
    const doc = withExtras(1);
    const extra = doc.bubbles[0]?.body.extras[0] as unknown as Record<
      string,
      unknown
    >;
    delete extra.depth;
    expect(validateDocument(doc).ok).toBe(false);
  });
});
