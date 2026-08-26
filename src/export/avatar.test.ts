// FR-10 export: portable avatar building and snapshot determinism.
import { describe, expect, it } from "vitest";
import {
  AVATAR_VERSION,
  buildPortableAvatar,
  packageFiles,
  readPortableAvatar,
  snapshotSvg,
  summarizeExport,
} from "./avatar";
import { createBubble, createDefaultDocument } from "../domain/document/create";
import { restingScene } from "../render/scene";
import { sceneToSvg } from "../render/svg";
import { previewSvg } from "./avatar";
import { addMood } from "../domain/document/mutate";
import { validateDocument } from "../domain/document/validate";
import full from "../test/fixtures/full.json";
import pkg from "../../package.json";
import type { StudioDocument } from "../domain/document/types";

const doc = full as unknown as StudioDocument;

// FR-2.6 reached the portable format in v2 and FR-2.2's authored depth in v3.
// The embed surface is public, so the runtime keeps reading every older file.
describe("readPortableAvatar", () => {
  it("builds at the current version", () => {
    const d = createDefaultDocument();
    expect(buildPortableAvatar(d.bubbles[0], d).version).toBe(AVATAR_VERSION);
  });

  it("upgrades a v1 file by defaulting its surface to round", () => {
    const d = createDefaultDocument();
    const v2 = buildPortableAvatar(d.bubbles[0], d);
    const v1 = structuredClone(v2) as unknown as Record<string, unknown>;
    v1.version = 1;
    delete (v1.bubble as { body: { surface: Record<string, unknown> } }).body
      .surface.shape;

    const read = readPortableAvatar(v1 as never);
    expect(read.version).toBe(AVATAR_VERSION);
    expect(read.bubble.body.surface.shape).toBe("round");
  });

  it("upgrades a v2 file by writing the depth it used to derive", () => {
    const d = createDefaultDocument();
    const current = buildPortableAvatar(d.bubbles[0], d);
    const v2 = structuredClone(current) as unknown as Record<string, unknown>;
    v2.version = 2;
    const surface = (
      v2.bubble as { body: { surface: Record<string, unknown> } }
    ).body.surface;
    delete surface.depth;

    const read = readPortableAvatar(v2 as never);
    expect(read.version).toBe(AVATAR_VERSION);
    const s = read.bubble.body.surface;
    expect(s.depth).toBeCloseTo(Math.min(s.width, s.height) * 0.85, 10);
  });

  it("upgrades a v3 file by giving every assembled primitive a depth", () => {
    const d = createDefaultDocument();
    const current = buildPortableAvatar(d.bubbles[0], d);
    const v3 = structuredClone(current) as unknown as Record<string, unknown>;
    v3.version = 3;
    const body = (v3.bubble as { body: { extras: Record<string, unknown>[] } })
      .body;
    body.extras = [
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

    const read = readPortableAvatar(v3 as never);
    expect(read.version).toBe(AVATAR_VERSION);
    expect(read.bubble.body.extras[0]?.depth).toBeCloseTo(40 * 0.85, 10);
  });

  it("leaves a current-version file alone", () => {
    const d = createDefaultDocument();
    const v2 = buildPortableAvatar(d.bubbles[0], d);
    expect(readPortableAvatar(v2)).toBe(v2);
  });

  it("keeps a v1 shape choice if the file somehow carries one", () => {
    const d = createDefaultDocument();
    const v2 = buildPortableAvatar(d.bubbles[0], d);
    const v1 = structuredClone(v2);
    (v1 as { version: number }).version = 1;
    v1.bubble.body.surface.shape = "drop";
    expect(readPortableAvatar(v1).bubble.body.surface.shape).toBe("drop");
  });
});

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
      version: 5 as const,
      kind: "bubble-studio-project" as const,
      activeBubbleId: avatar.bubble.id,
      locale: "es" as const,
      bubbles: [avatar.bubble],
      starterKit: avatar.kit,
    };
    expect(validateDocument(projected).ok).toBe(true);
  });
});

// FR-10.3: the export chooses which loops travel with the character, and the
// mood pruning has to follow that choice rather than the whole kit.
describe("loop selection (FR-10.3)", () => {
  const withTwoLoops = () => {
    const d = createDefaultDocument();
    const b = d.bubbles[0];
    const kit = b.ownKit ?? d.starterKit;
    return { d, b, kit };
  };

  it("embeds every loop by default", () => {
    const { d, b, kit } = withTwoLoops();
    expect(buildPortableAvatar(b, d).kit.loops).toHaveLength(
      kit.loops.filter((l) => l.steps.length > 0).length,
    );
  });

  it("embeds only the chosen loops", () => {
    const { d, b, kit } = withTwoLoops();
    const keep = kit.loops[1];
    if (!keep) throw new Error("fixture needs two loops");
    const built = buildPortableAvatar(b, d, [keep.id]);
    expect(built.kit.loops.map((l) => l.id)).toEqual([keep.id]);
  });

  it("prunes moods to the ones the chosen loops actually reference", () => {
    const { d, b, kit } = withTwoLoops();
    const keep = kit.loops[1];
    if (!keep) throw new Error("fixture needs two loops");
    const built = buildPortableAvatar(b, d, [keep.id]);
    const used = new Set(keep.steps.map((s) => s.moodId));
    expect(new Set(built.kit.moods.map((m) => m.id))).toEqual(used);
    // And the result is still internally consistent, which is the point.
    expect(
      validateDocument({ ...d, bubbles: [built.bubble], starterKit: built.kit })
        .ok,
    ).toBe(true);
  });

  it("an empty selection embeds no loops rather than all of them", () => {
    const { d, b } = withTwoLoops();
    const built = buildPortableAvatar(b, d, []);
    expect(built.kit.loops).toHaveLength(0);
    expect(built.kit.moods).toHaveLength(0);
  });
});

// FR-10.5: the package is meant to be openable and usable, so it carries a
// minimal example alongside the definition.
describe("package files (FR-10.5)", () => {
  it("ships the definition, a snapshot, a README and a usage example", () => {
    const d = createDefaultDocument();
    const names = packageFiles(d.bubbles[0], d).map((f) => f.name);
    expect(names).toEqual([
      "bubble.bubble-avatar.json",
      "bubble.svg",
      "README.md",
      "example.tsx",
    ]);
  });

  it("the example names the runtime component and an embedded loop", () => {
    const d = createDefaultDocument();
    const files = packageFiles(d.bubbles[0], d);
    const avatar = buildPortableAvatar(d.bubbles[0], d);
    const example = files.find((f) => f.name === "example.tsx");
    expect(example?.text).toContain("<BubbleAvatar");
    expect(example?.text).toContain("bubble.bubble-avatar.json");
    // The import has to name the package the runtime actually ships in, or
    // the "minimal usage example" is not usable (FR-10.5).
    expect(example?.text).toContain(`from "${pkg.name}/runtime"`);
    expect(example?.text).toContain(avatar.kit.loops[0]?.name ?? "");
  });

  it("omits the loop prop when nothing is embedded to play", () => {
    const d = createDefaultDocument();
    const example = packageFiles(d.bubbles[0], d, []).find(
      (f) => f.name === "example.tsx",
    );
    expect(example?.text).toContain("<BubbleAvatar");
    expect(example?.text).not.toContain("loop=");
  });
});

// FR-10.6: what the export will contain, said before it is built. Every number
// is read off the avatar `buildPortableAvatar` would produce, so the panel can
// never promise a package different from the one the button writes.
describe("summarizeExport (FR-10.6)", () => {
  const fresh = () => {
    const d = createDefaultDocument();
    const b = d.bubbles[0];
    return { d, b, kit: b.ownKit ?? d.starterKit };
  };

  it("counts the loops and moods the whole kit would embed", () => {
    const { d, b } = fresh();
    const built = buildPortableAvatar(b, d);
    const s = summarizeExport(b, d);
    expect(s.loops).toBe(built.kit.loops.length);
    expect(s.moods).toBe(built.kit.moods.length);
  });

  it("reports the moods the prune drops, not just the ones that survive", () => {
    const { d, b, kit } = fresh();
    const keep = kit.loops[1];
    if (!keep) throw new Error("fixture needs two loops");
    const s = summarizeExport(b, d, [keep.id]);
    expect(s.moods).toBe(new Set(keep.steps.map((x) => x.moodId)).size);
    expect(s.prunedMoods).toBe(kit.moods.length - s.moods);
    expect(s.prunedMoods).toBeGreaterThan(0);
  });

  it("weighs the definition in bytes, not characters", () => {
    const { d, b } = fresh();
    const s = summarizeExport(b, d);
    const json = JSON.stringify(buildPortableAvatar(b, d), null, 2);
    expect(s.bytes).toBe(new TextEncoder().encode(json).length);
    // Accented mood names would make a character count lie about the weight.
    expect(s.bytes).toBeGreaterThanOrEqual(json.length);
  });

  it("gets lighter as loops are dropped from the selection", () => {
    const { d, b, kit } = fresh();
    const one = kit.loops[0];
    if (!one) throw new Error("fixture needs a loop");
    expect(summarizeExport(b, d, [one.id]).bytes).toBeLessThan(
      summarizeExport(b, d).bytes,
    );
  });

  it("still weighs the bubble when nothing is selected", () => {
    const { d, b } = fresh();
    const s = summarizeExport(b, d, []);
    expect(s).toMatchObject({ loops: 0, moods: 0 });
    // The character itself is always in the file, so the weight is never zero.
    expect(s.bytes).toBeGreaterThan(0);
  });
});

// FR-10.1 asks for "the current stage", and a head turned by dragging it
// (FR-8.1) is part of that stage. It reached the render and the export frame
// drawn over it, but not the file the button wrote.
describe("snapshot carries the pose (FR-10.1)", () => {
  const posed = { x: 0, y: 40, z: 0 };

  it("renders a turned head as turned", () => {
    const d = createDefaultDocument();
    const b = d.bubbles[0];
    const resting = snapshotSvg(b, { size: 512, background: null });
    const turned = snapshotSvg(b, { size: 512, background: null }, posed);
    expect(turned).not.toBe(resting);
  });

  it("leaves the resting call byte-identical", () => {
    // The goldens go through restingScene directly, but the snapshot is the
    // other public path to the same bytes and must not drift from them.
    const d = createDefaultDocument();
    const b = d.bubbles[0];
    expect(snapshotSvg(b, { size: 512, background: null })).toBe(
      sceneToSvg(restingScene(b, 0), { background: null, size: 512 }),
    );
  });

  it("is still deterministic: the same pose twice is the same bytes", () => {
    // Ambient breathing stays parked at t=0. A pose is an instruction; a
    // wobble is not, and a snapshot that caught a random phase of one could
    // not be re-made.
    const d = createDefaultDocument();
    const b = d.bubbles[0];
    expect(snapshotSvg(b, { size: 512, background: null }, posed)).toBe(
      snapshotSvg(b, { size: 512, background: null }, posed),
    );
  });

  it("previews the same pose the download will carry", () => {
    // The preview's whole claim is that it is the snapshot in a smaller box.
    const d = createDefaultDocument();
    const b = d.bubbles[0];
    expect(previewSvg(b, { background: null, size: 132 }, posed)).not.toBe(
      previewSvg(b, { background: null, size: 132 }),
    );
  });

  it("leaves the portable definition unposed", () => {
    // A character file is a definition the runtime plays loops from. Baking a
    // pose into it would pose every future frame it renders.
    const d = createDefaultDocument();
    const b = d.bubbles[0];
    expect(buildPortableAvatar(b, d).bubble).toEqual(b);
  });
});
