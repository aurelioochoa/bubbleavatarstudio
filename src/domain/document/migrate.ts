// Document migration (docs/03 §8). v2 is current; v1 upgrades on the way in.
import { validateDocument } from "./validate";
import type { StudioDocument } from "./types";

export type MigrateResult =
  | { ok: true; doc: StudioDocument }
  | { ok: false; code: "E_VERSION" | "E_INVALID"; detail: string };

const CURRENT = 2;

/**
 * v1 -> v2: FR-2.6 gave the surface a shape family. A v1 surface predates it,
 * so it joins v2 on "round" — the family whose outline is byte-identical to
 * what v1 already drew, which is why the render goldens do not move.
 *
 * Shape-only: it never validates. A malformed husk is left as it is and fails
 * the validation pass below as E_INVALID rather than throwing here.
 */
function v1ToV2(doc: Record<string, unknown>): void {
  doc.version = CURRENT;
  const bubbles = doc.bubbles;
  if (!Array.isArray(bubbles)) return;
  for (const bubble of bubbles) {
    const surface = (bubble as { body?: { surface?: unknown } }).body?.surface;
    if (typeof surface !== "object" || surface === null) continue;
    const s = surface as Record<string, unknown>;
    s.shape ??= "round";
  }
}

export function migrate(input: unknown): MigrateResult {
  if (typeof input !== "object" || input === null) {
    return { ok: false, code: "E_INVALID", detail: "not an object" };
  }
  const version = (input as { version?: unknown }).version;
  if (version !== 1 && version !== CURRENT) {
    return {
      ok: false,
      code: "E_VERSION",
      detail: `unsupported version ${String(version)}`,
    };
  }

  // Clone first: migrating must not edit the caller's document in place.
  const doc = structuredClone(input) as Record<string, unknown>;
  if (version === 1) v1ToV2(doc);

  // Validation runs after the upgrade, because it demands the current version.
  const r = validateDocument(doc);
  if (!r.ok)
    return { ok: false, code: "E_INVALID", detail: "validation failed" };
  return { ok: true, doc: doc as unknown as StudioDocument };
}
