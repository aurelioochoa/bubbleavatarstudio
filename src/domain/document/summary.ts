// What a project file contains, counted (FR-9.3). Pure — the import
// confirmation needs it before the document is anywhere near the store.
import type { Kit, StudioDocument } from "./types";

export interface DocumentSummary {
  bubbles: number;
  moods: number;
  loops: number;
}

/**
 * Counts across every kit the file carries: the starter kit plus each private
 * kit a bubble has diverged into (docs/03 §5). Counting only the starter kit
 * would under-report a project whose bubbles have all been edited — precisely
 * the project a user would most want to be warned about replacing.
 */
export function summarizeDocument(doc: StudioDocument): DocumentSummary {
  const kits: Kit[] = [
    doc.starterKit,
    ...doc.bubbles.flatMap((b) => (b.ownKit ? [b.ownKit] : [])),
  ];
  return {
    bubbles: doc.bubbles.length,
    moods: kits.reduce((n, k) => n + k.moods.length, 0),
    loops: kits.reduce((n, k) => n + k.loops.length, 0),
  };
}

/**
 * FR-4.8: how many loops reference each mood in a kit, keyed by mood id, with
 * an entry for every mood the kit holds — including the unused ones, whose
 * zero is what makes deleting them safe to offer.
 *
 * Loops, not steps. A loop that names the same mood four times is still one
 * place the user has to go and edit before the mood can be deleted, and "used
 * in 1 loop" is the sentence that tells them where; "used 4 times" is not.
 *
 * This does not replace FR-5.6's E_REF — the reducer still refuses a
 * referenced mood, because a delete can be reached by paths that never see
 * this count. It moves the refusal forward to where the user can act on it.
 */
export function moodUsage(kit: Kit): Record<string, number> {
  const out: Record<string, number> = {};
  for (const m of kit.moods) out[m.id] = 0;
  for (const loop of kit.loops) {
    for (const moodId of new Set(loop.steps.map((s) => s.moodId))) {
      // A step may name a mood the kit no longer holds — the document is only
      // guaranteed consistent after validation, and this runs before it.
      if (moodId in out) out[moodId] += 1;
    }
  }
  return out;
}
