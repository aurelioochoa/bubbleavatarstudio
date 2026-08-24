// FR-11 validation coverage of all error codes (docs/03 §7).
import { describe, expect, it } from "vitest";
import { validateDocument } from "./validate";
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
    (doc as { version: number }).version = 3;
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
