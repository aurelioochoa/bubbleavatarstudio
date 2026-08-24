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
