// Drag-to-reorder for the rail, the mood grid and the loop timeline
// (docs/05 §2). The ↑ ↓ buttons beside each item stay: they are the
// accessible path, and this is the direct-manipulation one on top of it.
//
// Native HTML5 drag rather than a pointer-driven implementation — it gives
// keyboard-free users the platform's own drag affordances and drop cursors for
// free, and it costs no dependency.
import { useState } from "react";

/** MIME the dragged id travels under; `text/plain` is the one jsdom and every
 * browser agree on. */
const ID_TYPE = "text/plain";

export interface DragReorder {
  /** Spread onto each item; carries both the drag source and the drop target. */
  itemProps: (id: string) => {
    draggable: true;
    onDragStart: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
    onDragEnd: () => void;
    "data-dragging"?: "true";
  };
  /** The id currently lifted, for styling. */
  dragging: string | null;
}

/**
 * Move `from` to sit where `to` currently sits. Returns null when the move
 * would be a no-op or names something the list does not hold, so the caller
 * never dispatches a reorder that changes nothing.
 */
export function movedOrder(
  ids: readonly string[],
  from: string,
  to: string,
): string[] | null {
  const fromIndex = ids.indexOf(from);
  const toIndex = ids.indexOf(to);
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return null;
  const next = ids.filter((id) => id !== from);
  next.splice(next.indexOf(to) + (toIndex > fromIndex ? 1 : 0), 0, from);
  return next;
}

export function useDragReorder(
  ids: readonly string[],
  onReorder: (next: string[]) => void,
): DragReorder {
  const [dragging, setDragging] = useState<string | null>(null);

  return {
    dragging,
    itemProps: (id) => ({
      draggable: true,
      onDragStart: (e) => {
        setDragging(id);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData(ID_TYPE, id);
      },
      onDragOver: (e) => {
        // Without preventDefault the element is not a drop target at all.
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      },
      onDrop: (e) => {
        e.preventDefault();
        // The state is the fast path; the payload is what makes a drag from
        // another list, or a remounted source, still land correctly.
        const from = dragging ?? e.dataTransfer.getData(ID_TYPE);
        setDragging(null);
        const next = from ? movedOrder(ids, from, id) : null;
        if (next) onReorder(next);
      },
      onDragEnd: () => {
        setDragging(null);
      },
      ...(dragging === id ? { "data-dragging": "true" as const } : {}),
    }),
  };
}
