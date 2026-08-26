// Durable studio state: a reducer wrapping domain mutations transactionally
// (FR-9). Invalid mutation results are discarded, never applied.
import { useReducer } from "react";
import { createDefaultDocument } from "../../domain/document/create";
import { migrate } from "../../domain/document/migrate";
import * as M from "../../domain/document/mutate";
import { topUpLibrary } from "../../domain/document/library";
import { validateDocument } from "../../domain/document/validate";
import type { Locale, StudioDocument } from "../../domain/document/types";

export type Action =
  | { type: "load"; doc: StudioDocument }
  | { type: "reset" }
  | { type: "locale"; locale: Locale }
  | { type: "bubble/add"; name: string }
  | { type: "bubble/rename"; id: string; name: string }
  | { type: "bubble/duplicate"; id: string }
  | { type: "bubble/remove"; id: string }
  | { type: "bubble/active"; id: string }
  | { type: "bubble/reorder"; ids: string[] }
  | { type: "surface/patch"; patch: Parameters<typeof M.updateSurface>[2] }
  | { type: "colors/patch"; patch: Parameters<typeof M.updateColors>[2] }
  | { type: "extra/add"; extra: Parameters<typeof M.addExtra>[2] }
  | {
      type: "extra/update";
      extraId: string;
      patch: Parameters<typeof M.updateExtra>[3];
    }
  | { type: "extra/remove"; extraId: string }
  | { type: "eye/shape"; patch: Parameters<typeof M.updateEyeShape>[2] }
  | {
      type: "eye/placement";
      side: "left" | "right";
      patch: Parameters<typeof M.updateEyePlacement>[3];
    }
  | { type: "eye/linked"; linked: boolean }
  | { type: "eye/spacing"; spacing: number }
  | { type: "ambient/patch"; patch: Parameters<typeof M.updateAmbient>[2] }
  | { type: "mood/add"; name: string }
  | {
      type: "mood/update";
      moodId: string;
      patch: Parameters<typeof M.updateMood>[3];
    }
  | { type: "mood/remove"; moodId: string }
  | { type: "mood/duplicate"; moodId: string }
  | { type: "mood/reorder"; ids: string[] }
  | { type: "loop/add"; init?: Parameters<typeof M.addLoop>[2] }
  | {
      type: "loop/update";
      loopId: string;
      patch: Parameters<typeof M.updateLoop>[3];
    }
  | { type: "loop/remove"; loopId: string }
  | { type: "loop/duplicate"; loopId: string }
  | {
      type: "step/add";
      loopId: string;
      step: Parameters<typeof M.addStep>[3];
      /** Where it lands (FR-5.10); appended when absent. */
      at?: number;
    }
  | {
      type: "step/update";
      loopId: string;
      stepId: string;
      patch: Parameters<typeof M.updateStep>[4];
    }
  | { type: "step/remove"; loopId: string; stepId: string }
  | { type: "step/reorder"; loopId: string; stepIds: string[] }
  | { type: "kit/reset" }
  | { type: "library/topUp" };

/** Applies a mutation result transactionally; failures keep the current doc. */
function commit(doc: StudioDocument, r: M.MutationResult): StudioDocument {
  return r.ok && validateDocument(r.doc).ok ? r.doc : doc;
}

export interface StudioState {
  doc: StudioDocument;
  /** Last rejected operation (for toasts), or null. */
  lastError: { code: string; detail: string } | null;
}

export function studioReducer(state: StudioState, action: Action): StudioState {
  const doc = state.doc;
  const bubbleId = doc.activeBubbleId ?? "";
  const apply = (r: M.MutationResult): StudioState =>
    r.ok
      ? { doc: commit(doc, r), lastError: null }
      : { doc, lastError: { code: r.code, detail: r.detail } };
  switch (action.type) {
    case "load": {
      const m = migrate(action.doc);
      return m.ok ? { doc: m.doc, lastError: null } : state;
    }
    case "reset":
      return { doc: M.freshDocument(), lastError: null };
    case "locale":
      return { ...state, doc: { ...doc, locale: action.locale } };
    case "bubble/add":
      return apply(M.addBubble(doc, action.name));
    case "bubble/rename":
      return apply(M.renameBubble(doc, action.id, action.name));
    case "bubble/duplicate":
      return apply(M.duplicateBubble(doc, action.id));
    case "bubble/remove":
      return apply(M.removeBubble(doc, action.id));
    case "bubble/active":
      return apply(M.setActiveBubble(doc, action.id));
    case "bubble/reorder":
      return apply(M.reorderBubbles(doc, action.ids));
    case "surface/patch":
      return apply(M.updateSurface(doc, bubbleId, action.patch));
    case "colors/patch":
      return apply(M.updateColors(doc, bubbleId, action.patch));
    case "extra/add":
      return apply(M.addExtra(doc, bubbleId, action.extra));
    case "extra/update":
      return apply(M.updateExtra(doc, bubbleId, action.extraId, action.patch));
    case "extra/remove":
      return apply(M.removeExtra(doc, bubbleId, action.extraId));
    case "eye/shape":
      return apply(M.updateEyeShape(doc, bubbleId, action.patch));
    case "eye/placement":
      return apply(
        M.updateEyePlacement(doc, bubbleId, action.side, action.patch),
      );
    case "eye/linked":
      return apply(M.setLinked(doc, bubbleId, action.linked));
    case "eye/spacing":
      return apply(M.setSpacing(doc, bubbleId, action.spacing));
    case "ambient/patch":
      return apply(M.updateAmbient(doc, bubbleId, action.patch));
    case "mood/add":
      return apply(M.addMood(doc, bubbleId, action.name));
    case "mood/update":
      return apply(M.updateMood(doc, bubbleId, action.moodId, action.patch));
    case "mood/remove":
      return apply(M.removeMood(doc, bubbleId, action.moodId));
    case "mood/duplicate":
      return apply(M.duplicateMood(doc, bubbleId, action.moodId));
    case "mood/reorder":
      return apply(M.reorderMoods(doc, bubbleId, action.ids));
    case "loop/add":
      return apply(M.addLoop(doc, bubbleId, action.init));
    case "loop/update":
      return apply(M.updateLoop(doc, bubbleId, action.loopId, action.patch));
    case "loop/remove":
      return apply(M.removeLoop(doc, bubbleId, action.loopId));
    case "loop/duplicate":
      return apply(M.duplicateLoop(doc, bubbleId, action.loopId));
    case "step/add":
      return apply(
        M.addStep(
          doc,
          bubbleId,
          action.loopId,
          action.step,
          undefined,
          action.at,
        ),
      );
    case "step/update":
      return apply(
        M.updateStep(doc, bubbleId, action.loopId, action.stepId, action.patch),
      );
    case "step/remove":
      return apply(M.removeStep(doc, bubbleId, action.loopId, action.stepId));
    case "step/reorder":
      return apply(
        M.reorderSteps(doc, bubbleId, action.loopId, action.stepIds),
      );
    case "kit/reset":
      return apply(M.resetKit(doc, bubbleId));
    case "library/topUp":
      // Additive by construction (see domain/document/library.ts), so this is
      // the one kit action that needs no confirmation.
      return apply(topUpLibrary(doc, bubbleId));
  }
}

export function initialStudioState(): StudioState {
  return { doc: createDefaultDocument(), lastError: null };
}

export function useStudio(): readonly [StudioState, React.Dispatch<Action>] {
  return useReducer(studioReducer, undefined, initialStudioState);
}
