// Portable avatar export: kit-inlined, pruned, validated before download (FR-10, docs/06).
import { restingScene, SCENE_SIZE } from "../render/scene";
import { sceneToSvg, type SvgOptions } from "../render/svg";
import type { Bubble, Kit, StudioDocument } from "../domain/document/types";

export const AVATAR_FORMAT = "bubble-avatar";
export const AVATAR_VERSION = 5;

/**
 * Versions the runtime still reads. v1 predates the shape family (FR-2.6), v2
 * the surface's authored depth (FR-2.2), v3 the depth every assembled
 * primitive now carries (FR-2.3), v4 the pose a mood turns the body to
 * (FR-4.10).
 */
export type AvatarFileVersion = 1 | 2 | 3 | 4 | typeof AVATAR_VERSION;

export interface PortableAvatar {
  version: AvatarFileVersion;
  kind: typeof AVATAR_FORMAT;
  bubble: Bubble;
  kit: Kit;
}

/**
 * Accepts any avatar file the runtime still reads and returns it at the
 * current version. These are the same defaults migrate() applies to a
 * project, for the same reason: "round" is the family whose outline is
 * byte-identical to what v1 drew, `min(width, height) * 0.85` is the depth
 * the projection derived for itself before v3, and facing straight ahead is
 * exactly what a mood looked like before it could turn the body.
 *
 * Returns the input untouched when it is already current, so the common path
 * costs nothing.
 */
export function readPortableAvatar(input: PortableAvatar): PortableAvatar {
  if (input.version === AVATAR_VERSION) return input;
  const next = structuredClone(input);
  next.version = AVATAR_VERSION;
  // The file is untrusted JSON: the fields the type promises may not be there.
  const surface = next.bubble.body.surface as {
    shape?: string;
    depth?: number;
    width?: number;
    height?: number;
  };
  surface.shape ??= "round";
  if (
    surface.depth === undefined &&
    typeof surface.width === "number" &&
    typeof surface.height === "number"
  ) {
    surface.depth = Math.min(surface.width, surface.height) * 0.85;
  }
  for (const extra of next.bubble.body.extras as unknown as Record<
    string,
    unknown
  >[]) {
    if (extra.depth !== undefined) continue;
    const { width, height } = extra;
    if (typeof width !== "number" || typeof height !== "number") continue;
    extra.depth = Math.min(width, height) * 0.85;
  }
  for (const mood of next.kit.moods as unknown as Record<string, unknown>[]) {
    mood.head ??= { x: 0, y: 0, z: 0 };
  }
  return next;
}

/**
 * Kit inlined; orphan moods (not referenced by any kept loop) are pruned.
 *
 * `loopIds` is the export's loop picker (FR-10.3): omit it and every playable
 * loop travels, pass a list and only those do — with the mood pruning keyed to
 * that same list, so a two-loop selection never drags the whole library along.
 */
export function buildPortableAvatar(
  bubble: Bubble,
  doc: StudioDocument,
  loopIds?: readonly string[],
): PortableAvatar {
  const kit = bubble.ownKit ?? doc.starterKit;
  const chosen =
    loopIds === undefined
      ? kit.loops
      : kit.loops.filter((l) => loopIds.includes(l.id));
  const loops = chosen.filter((l) => l.steps.length > 0);
  const usedMoodIds = new Set(
    loops.flatMap((l) => l.steps.map((s) => s.moodId)),
  );
  const moods = kit.moods.filter((m) => usedMoodIds.has(m.id));
  return {
    version: AVATAR_VERSION,
    kind: AVATAR_FORMAT,
    bubble: structuredClone(bubble),
    kit: { moods, loops: loops.map((l) => structuredClone(l)) },
  };
}

/** FR-10.6: what the export will contain, counted before it is written. */
export interface ExportSummary {
  /** Loops the definition will carry, after empty ones are dropped. */
  loops: number;
  /** Moods it will carry, after the prune to what those loops reference. */
  moods: number;
  /** Moods in the kit that the prune leaves behind. */
  prunedMoods: number;
  /** Weight of the definition file in bytes. */
  bytes: number;
}

/**
 * FR-10.6: the Share panel's line about the package, derived from the avatar
 * `buildPortableAvatar` would actually build. Reusing the builder rather than
 * re-counting the kit is the whole point — a panel that counts for itself will
 * eventually promise a package the button does not write.
 *
 * The weight is the definition file, not the ZIP. The README, the example and
 * the snapshot are fixed overhead that no choice in the panel moves; the
 * definition is the part the loop picker changes, so it is the part worth
 * showing while the picker is being used.
 */
export function summarizeExport(
  bubble: Bubble,
  doc: StudioDocument,
  loopIds?: readonly string[],
): ExportSummary {
  const kit = bubble.ownKit ?? doc.starterKit;
  const built = buildPortableAvatar(bubble, doc, loopIds);
  const json = JSON.stringify(built, null, 2);
  return {
    loops: built.kit.loops.length,
    moods: built.kit.moods.length,
    prunedMoods: kit.moods.length - built.kit.moods.length,
    bytes: new TextEncoder().encode(json).length,
  };
}

/** One file of the export package, ready for `createZip` (FR-10.5). */
export interface PackageFile {
  name: string;
  text: string;
}

const DEFINITION_FILE = "bubble.bubble-avatar.json";
/** Where the example imports the runtime from — this repo's own package name. */
const RUNTIME_PACKAGE = "bubbleavatarstudio/runtime";

/**
 * The package a user unzips: the definition, a snapshot to look at, a README,
 * and a minimal example that actually compiles against the runtime — the
 * loop it names is one that is really embedded, so copying it works.
 */
export function packageFiles(
  bubble: Bubble,
  doc: StudioDocument,
  loopIds?: readonly string[],
): PackageFile[] {
  const avatar = buildPortableAvatar(bubble, doc, loopIds);
  const loop = avatar.kit.loops.at(0);
  const loopProp = loop ? `\n      loop="${loop.name}"\n      autoplay` : "";
  return [
    { name: DEFINITION_FILE, text: JSON.stringify(avatar, null, 2) },
    {
      // Unposed on purpose: this sits beside a definition that carries no
      // pose either, and the README below says which one it is. The Share
      // panel's own snapshot does carry the stage's pose (FR-10.1).
      name: "bubble.svg",
      text: snapshotSvg(bubble, { size: 1024, background: null }),
    },
    {
      name: "README.md",
      text: [
        `# ${bubble.name}`,
        "",
        "A Bubble Avatar export.",
        "",
        `- \`${DEFINITION_FILE}\` — the portable definition the runtime reads.`,
        "- `bubble.svg` — a 1024px snapshot of the resting pose.",
        "- `example.tsx` — the smallest thing that renders it.",
        "",
        `Loops in this package: ${
          avatar.kit.loops.map((l) => l.name).join(", ") || "(none)"
        }.`,
        "",
        "The runtime ships as a package; it is not inlined here.",
        "",
      ].join("\n"),
    },
    {
      name: "example.tsx",
      text: [
        `import { BubbleAvatar } from "${RUNTIME_PACKAGE}";`,
        `import definition from "./${DEFINITION_FILE}";`,
        "",
        "export function Example() {",
        "  return (",
        "    <BubbleAvatar",
        "      definition={definition}" + loopProp,
        "      size={256}",
        "    />",
        "  );",
        "}",
        "",
      ].join("\n"),
    },
  ];
}

export interface SnapshotOptions {
  size: 512 | 1024 | 2048;
  background: SvgOptions["background"];
}

/**
 * The pose the stage is holding (FR-8.1), which FR-10.1's "current stage"
 * includes. Defaulted rather than required: every caller that wants the
 * resting character — the goldens' neighbours, the runtime, a test — keeps
 * asking for exactly the bytes it always got.
 */
export type HeadRotation = { x: number; y: number; z: number };
const RESTING_HEAD: HeadRotation = { x: 0, y: 0, z: 0 };

/**
 * A small framed render of what a snapshot would produce (docs/05 §2). Same
 * scene and same background as `snapshotSvg`; only the box differs, which is
 * what makes it an honest preview rather than an approximation of one.
 */
export function previewSvg(
  bubble: Bubble,
  opts: { background: SvgOptions["background"]; size: number },
  head: HeadRotation = RESTING_HEAD,
): string {
  return sceneToSvg(restingScene(bubble, 0, head), opts);
}

/**
 * The stage as a file (FR-10.1), at the requested size.
 *
 * Deterministic in the one way that matters: ambient breathing stays parked
 * at t=0, so the same character and the same pose are always the same bytes.
 * The pose itself is an instruction the user gave by dragging; a breath is
 * not, and a snapshot that caught a random phase of one could not be re-made.
 */
export function snapshotSvg(
  bubble: Bubble,
  opts: SnapshotOptions,
  head: HeadRotation = RESTING_HEAD,
): string {
  return sceneToSvg(restingScene(bubble, 0, head), {
    background: opts.background,
    size: opts.size,
  });
}

/** PNG via canvas rasterization (browser only). */
export async function snapshotPng(
  bubble: Bubble,
  opts: SnapshotOptions,
  head: HeadRotation = RESTING_HEAD,
): Promise<Blob> {
  const svg = snapshotSvg(bubble, opts, head);
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.decoding = "sync";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => {
        resolve();
      };
      img.onerror = () => {
        reject(new Error("svg raster failed"));
      };
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = opts.size;
    canvas.height = opts.size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no 2d context");
    ctx.drawImage(img, 0, 0, opts.size, opts.size);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => {
        if (b) resolve(b);
        else reject(new Error("toBlob failed"));
      }, "image/png");
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function download(
  filename: string,
  data: Blob | string,
  mime = "application/json",
): void {
  const blob =
    typeof data === "string" ? new Blob([data], { type: mime }) : data;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export { SCENE_SIZE };
