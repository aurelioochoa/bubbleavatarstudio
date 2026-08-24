// Topping an existing project up to the current starter library
// (FR-4.7, FR-5.7).
//
// `starterKit()` runs inside `createDefaultDocument()` and nowhere else, so a
// project already in storage keeps whatever kit it was saved with: growing the
// library does not retro-fit saved work. That is the right default — the kit
// is user-editable, and refreshing it wholesale would clobber renamed or
// retuned moods — but it leaves a returning user short of content the spec
// promises. This is the explicit, additive way out.
//
// Two rules make it safe to offer:
//   1. It only ever appends. Nothing already in the kit is renamed, retuned,
//      reordered or removed, so no existing loop can lose its referent.
//   2. It matches by name, because a document carries no link back to the
//      library entry it came from. A renamed starter mood therefore reads as
//      "missing", and the library entry returns beside the rename rather than
//      overwriting it — additive, and visible.
import { newId, type Random } from "../ids";
import { starterKit } from "./create";
import type { MutationDeps, MutationResult } from "./mutate";
import type { Kit, Loop, Mood, StudioDocument } from "./types";

export interface LibraryGap {
  moods: number;
  loops: number;
}

/** What the current library holds that this kit does not. */
export function libraryGap(kit: Kit): LibraryGap {
  const library = starterKit();
  const moodNames = new Set(kit.moods.map((m) => m.name));
  const loopNames = new Set(kit.loops.map((l) => l.name));
  return {
    moods: library.moods.filter((m) => !moodNames.has(m.name)).length,
    loops: library.loops.filter((l) => !loopNames.has(l.name)).length,
  };
}

/**
 * Appends every library mood and loop this kit is missing. Added loops are
 * rewired to the moods now present by name, so a loop the user already owned
 * keeps its own steps and an added one points at real ids.
 */
export function topUpKit(kit: Kit, random?: Random): Kit {
  const library = starterKit();

  const moodNames = new Set(kit.moods.map((m) => m.name));
  const addedMoods: Mood[] = library.moods
    .filter((m) => !moodNames.has(m.name))
    .map((m) => ({ ...m, id: newId("mood", random) }));
  const moods = [...kit.moods, ...addedMoods];

  // The library's own ids mean nothing here; names are the only bridge.
  const idByName = new Map(moods.map((m) => [m.name, m.id]));
  const libraryMoodName = new Map(library.moods.map((m) => [m.id, m.name]));

  const loopNames = new Set(kit.loops.map((l) => l.name));
  const addedLoops: Loop[] = library.loops
    .filter((l) => !loopNames.has(l.name))
    .map((l) => ({
      ...l,
      id: newId("loop", random),
      steps: l.steps.map((s) => ({
        ...s,
        id: newId("stp", random),
        moodId: idByName.get(libraryMoodName.get(s.moodId) ?? "") ?? s.moodId,
      })),
    }));

  return { moods, loops: [...kit.loops, ...addedLoops] };
}

/**
 * Tops up whichever kit the bubble actually reads. An inheriting bubble tops
 * up the shared starter kit — so every other inheriting bubble gains the
 * content too, and no copy-on-write fork happens behind the user's back. A
 * bubble that already owns a kit tops up that one and nothing else.
 */
export function topUpLibrary(
  doc: StudioDocument,
  bubbleId: string,
  deps?: MutationDeps,
): MutationResult {
  const random: Random | undefined = deps?.random;
  const index = doc.bubbles.findIndex((b) => b.id === bubbleId);
  if (index === -1) {
    return { ok: false, code: "E_NOT_FOUND", detail: `bubble ${bubbleId}` };
  }
  const bubble = doc.bubbles[index];
  if (!bubble.ownKit) {
    return {
      ok: true,
      doc: { ...doc, starterKit: topUpKit(doc.starterKit, random) },
    };
  }
  const bubbles = [...doc.bubbles];
  bubbles[index] = { ...bubble, ownKit: topUpKit(bubble.ownKit, random) };
  return { ok: true, doc: { ...doc, bubbles } };
}
