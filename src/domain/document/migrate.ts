// Document migration (docs/03 §8). v6 is current; v1..v5 upgrade on the way in.
import { validateDocument } from "./validate";
import { topUpKit } from "./library";
import type { Kit, StudioDocument } from "./types";

export type MigrateResult =
  | { ok: true; doc: StudioDocument }
  | { ok: false; code: "E_VERSION" | "E_INVALID"; detail: string };

const CURRENT = 6;

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

/**
 * v4 -> v5: FR-4.7/FR-5.7. The starter library grew to 24 moods and 20 loops
 * after v4 shipped, and `starterKit()` only ever runs for a *new* document, so
 * a project already in storage kept the four-mood kit it was saved with. The
 * Moods panel offered the difference as a row the user had to press, on every
 * visit, forever. v5 simply carries the content in.
 *
 * Safe because `topUpKit` is additive by construction (see library.ts): it
 * appends only what a kit lacks, matches by name, and never renames, retunes,
 * reorders or removes — so no existing loop can lose its referent, and a mood
 * the user renamed keeps its name with the library entry returning beside it.
 *
 * Every kit the document reads is topped up, the shared one and any a bubble
 * owns, because the panel shows the row for whichever kit the active bubble
 * actually reads.
 *
 * Unlike the migrations above this one is not shape-only — it needs real
 * moods and loops to append to — so it runs *after* validation, on a document
 * already known to be well formed.
 */
function v4ToV5(doc: StudioDocument): StudioDocument {
  const topUp = (kit: Kit): Kit => topUpKit(kit);
  return {
    ...doc,
    starterKit: topUp(doc.starterKit),
    bubbles: doc.bubbles.map((b) =>
      b.ownKit ? { ...b, ownKit: topUp(b.ownKit) } : b,
    ),
  };
}

/**
 * v5 -> v6: FR-4.10 gave a mood a pose of its own. A v5 mood predates it and
 * joins v6 facing straight ahead, which is exactly what it already looked
 * like — the body did not move for any mood before this, so no saved
 * character changes and the render goldens do not move.
 *
 * Shape-only, like the migrations above it: a husk whose moods are not
 * objects is left alone and fails validation below as E_INVALID.
 */
function v5ToV6(doc: Record<string, unknown>): void {
  const kits: unknown[] = [doc.starterKit];
  const bubbles = doc.bubbles;
  if (Array.isArray(bubbles)) {
    for (const b of bubbles) {
      if (typeof b === "object" && b !== null) {
        kits.push((b as { ownKit?: unknown }).ownKit);
      }
    }
  }
  for (const kit of kits) {
    if (typeof kit !== "object" || kit === null) continue;
    const moods = (kit as { moods?: unknown }).moods;
    if (!Array.isArray(moods)) continue;
    for (const mood of moods) {
      if (typeof mood !== "object" || mood === null) continue;
      const m = mood as Record<string, unknown>;
      m.head ??= { x: 0, y: 0, z: 0 };
    }
  }
}

export function migrate(input: unknown): MigrateResult {
  if (typeof input !== "object" || input === null) {
    return { ok: false, code: "E_INVALID", detail: "not an object" };
  }
  const version = (input as { version?: unknown }).version;
  if (
    version !== 1 &&
    version !== 2 &&
    version !== 3 &&
    version !== 4 &&
    version !== 5 &&
    version !== CURRENT
  ) {
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
  if (version <= 5) v5ToV6(doc);
  doc.version = CURRENT;

  // Validation runs after the upgrade, because it demands the current version.
  const r = validateDocument(doc);
  if (!r.ok)
    return { ok: false, code: "E_INVALID", detail: "validation failed" };

  // The library top-up wants a validated document, so it comes last. A v5 or
  // later document has had it already; running it again would resurrect a
  // starter mood the user has since deleted.
  const migrated = doc as unknown as StudioDocument;
  return {
    ok: true,
    doc: version <= 4 ? v4ToV5(migrated) : migrated,
  };
}
