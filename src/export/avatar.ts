// Portable avatar export: kit-inlined, pruned, validated before download (FR-10, docs/06).
import { restingScene, SCENE_SIZE } from "../render/scene";
import { sceneToSvg, type SvgOptions } from "../render/svg";
import type { Bubble, Kit, StudioDocument } from "../domain/document/types";

export const AVATAR_FORMAT = "bubble-avatar";
export const AVATAR_VERSION = 1;

export interface PortableAvatar {
  version: typeof AVATAR_VERSION;
  kind: typeof AVATAR_FORMAT;
  bubble: Bubble;
  kit: Kit;
}

/** Kit inlined; orphan moods (not referenced by any kept loop) are pruned. */
export function buildPortableAvatar(
  bubble: Bubble,
  doc: StudioDocument,
): PortableAvatar {
  const kit = bubble.ownKit ?? doc.starterKit;
  const usedMoodIds = new Set(
    kit.loops.flatMap((l) => l.steps.map((s) => s.moodId)),
  );
  const moods = kit.moods.filter((m) => usedMoodIds.has(m.id));
  const loops = kit.loops.filter((l) => l.steps.length > 0);
  return {
    version: AVATAR_VERSION,
    kind: AVATAR_FORMAT,
    bubble: structuredClone(bubble),
    kit: { moods, loops: loops.map((l) => structuredClone(l)) },
  };
}

export interface SnapshotOptions {
  size: 512 | 1024 | 2048;
  background: SvgOptions["background"];
}

/** Deterministic resting-pose snapshot SVG string at the requested size. */
export function snapshotSvg(bubble: Bubble, opts: SnapshotOptions): string {
  return sceneToSvg(restingScene(bubble, 0), {
    background: opts.background,
    size: opts.size,
  });
}

/** PNG via canvas rasterization (browser only). */
export async function snapshotPng(
  bubble: Bubble,
  opts: SnapshotOptions,
): Promise<Blob> {
  const svg = snapshotSvg(bubble, opts);
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
