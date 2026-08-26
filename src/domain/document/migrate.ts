// Document migration (docs/03 §8). v4 is current; v1..v3 upgrade on the way in.
import { validateDocument } from "./validate";
import type { StudioDocument } from "./types";

export type MigrateResult =
  | { ok: true; doc: StudioDocument }
  | { ok: false; code: "E_VERSION" | "E_INVALID"; detail: string };

const CURRENT = 4;

/**
 * The depth radius the projection derived for itself before v3, as a fraction
 * of the smaller in-plane radius. Kept here as the migration default.
 */
const LEGACY_DEPTH_RATIO = 0.85;

/**
 * v1 -> v2: FR-2.6 gave the surface a shape family. A v1 surface predates it,
 * so it joins v2 on "round" — the family whose outline is byte-identical to
 * what v1 already drew, which is why the render goldens do not move.
 *
 * Shape-only: it never validates. A malformed husk is left as it is and fails
 * the validation pass below as E_INVALID rather than throwing here.
 */
function v1ToV2(doc: Record<string, unknown>): void {
  const bubbles = doc.bubbles;
  if (!Array.isArray(bubbles)) return;
  for (const bubble of bubbles) {
    const surface = (bubble as { body?: { surface?: unknown } }).body?.surface;
    if (typeof surface !== "object" || surface === null) continue;
    const s = surface as Record<string, unknown>;
    s.shape ??= "round";
  }
}

/**
 * v2 -> v3: FR-2.2 gave the surface an authored depth. A v2 surface predates
 * it, so it joins v3 on the depth the projection used to derive for itself —
 * `min(width, height) * 0.85` — which is why no saved character changes shape
 * and the render goldens do not move.
 *
 * Shape-only, like v1ToV2: a husk with a non-numeric box is left alone and
 * fails the validation pass below as E_INVALID rather than throwing here.
 */
function v2ToV3(doc: Record<string, unknown>): void {
  const bubbles = doc.bubbles;
  if (!Array.isArray(bubbles)) return;
  for (const bubble of bubbles) {
    const surface = (bubble as { body?: { surface?: unknown } }).body?.surface;
    if (typeof surface !== "object" || surface === null) continue;
    const s = surface as Record<string, unknown>;
    if (s.depth !== undefined) continue;
    const { width, height } = s;
    if (typeof width !== "number" || typeof height !== "number") continue;
    s.depth = Math.min(width, height) * LEGACY_DEPTH_RATIO;
  }
}

/**
 * v3 -> v4: FR-2.3 gave every assembled primitive a depth of its own. A v3
 * extra predates it, so it joins v4 on the same rule the surface took at v3 —
 * `min(width, height) * 0.85`. That is the thickness the renderer effectively
 * assumed when it treated an extra as a flat shape riding the surface, so a
 * saved character keeps the silhouette it had.
 *
 * Shape-only, like the migrations before it.
 */
function v3ToV4(doc: Record<string, unknown>): void {
  const bubbles = doc.bubbles;
  if (!Array.isArray(bubbles)) return;
  for (const bubble of bubbles) {
    const extras = (bubble as { body?: { extras?: unknown } }).body?.extras;
    if (!Array.isArray(extras)) continue;
    for (const extra of extras) {
      if (typeof extra !== "object" || extra === null) continue;
      const e = extra as Record<string, unknown>;
      if (e.depth !== undefined) continue;
      const { width, height } = e;
      if (typeof width !== "number" || typeof height !== "number") continue;
      e.depth = Math.min(width, height) * LEGACY_DEPTH_RATIO;
    }
  }
}

export function migrate(input: unknown): MigrateResult {
  if (typeof input !== "object" || input === null) {
    return { ok: false, code: "E_INVALID", detail: "not an object" };
  }
  const version = (input as { version?: unknown }).version;
  if (version !== 1 && version !== 2 && version !== 3 && version !== CURRENT) {
    return {
      ok: false,
      code: "E_VERSION",
      detail: `unsupported version ${String(version)}`,
    };
  }

  // Clone first: migrating must not edit the caller's document in place.
  const doc = structuredClone(input) as Record<string, unknown>;
  // Upgrades chain, so a v1 document passes through every step in turn.
  if (version === 1) v1ToV2(doc);
  if (version <= 2) v2ToV3(doc);
  if (version <= 3) v3ToV4(doc);
  doc.version = CURRENT;

  // Validation runs after the upgrade, because it demands the current version.
  const r = validateDocument(doc);
  if (!r.ok)
    return { ok: false, code: "E_INVALID", detail: "validation failed" };
  return { ok: true, doc: doc as unknown as StudioDocument };
}
