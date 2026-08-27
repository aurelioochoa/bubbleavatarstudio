// Drag-to-reorder for the rail, the mood grid and the loop timeline
// (docs/05 §2). The ↑ ↓ buttons beside each item stay: they are the
// accessible path, and this is the direct-manipulation one on top of it.
//
// Pointer Events rather than native HTML5 drag (FR-12.4). Native drag reads
// better on paper — the platform's own drop cursors, no dependency — but a
// touchscreen never starts one, so all three lists were unreorderable with a
// finger and no styling could have fixed it. One pointer-driven implementation
// serves both, at the cost of drawing the lifted state ourselves.
//
// The two pointers arm differently, which is the whole subtlety here. A mouse
// arms as soon as the press moves: a press that then moves is unambiguous, and
// waiting would make the list feel stuck. A finger arms only on a press held
// still, because every one of these lists sits inside something that scrolls —
// the mood grid in the inspector's scroll box, the rail strip sideways on a
// phone — and a finger that moves straight away is scrolling it. Arming on
// movement would turn each list into a trap that eats the scroll.
import { useEffect, useRef, useState } from "react";

/** How long a finger must rest before the press becomes a lift. */
export const HOLD_MS = 400;

/** Movement below this is a press, not a drag. Also what tells a finger's
 *  scroll from its hold: any of it before the timer disarms the gesture. */
const SLOP_PX = 6;

export interface DragReorder {
  /** Spread onto each item; carries both the drag source and the drop target. */
  itemProps: (id: string) => {
    "data-reorder-id": string;
    onPointerDown: (e: React.PointerEvent) => void;
    onPointerMove: (e: React.PointerEvent) => void;
    onPointerUp: (e: React.PointerEvent) => void;
    onPointerCancel: () => void;
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

interface Press {
  id: string;
  x: number;
  y: number;
  /** Whether this press has become a drag. */
  armed: boolean;
  /** The pending hold. Cancelling it is what makes a finger that moved first
   *  a scroll: there is no later moment at which it could still arm. */
  timer: ReturnType<typeof setTimeout> | null;
}

/** Which item, if any, is under the pointer. */
function itemUnder(x: number, y: number): string | null {
  const el = document.elementFromPoint(x, y);
  return (
    el?.closest("[data-reorder-id]")?.getAttribute("data-reorder-id") ?? null
  );
}

export function useDragReorder(
  ids: readonly string[],
  onReorder: (next: string[]) => void,
): DragReorder {
  const [dragging, setDragging] = useState<string | null>(null);
  const press = useRef<Press | null>(null);

  const release = () => {
    const p = press.current;
    if (p?.timer) clearTimeout(p.timer);
    press.current = null;
    setDragging(null);
  };

  // Unmounting mid-drag must not leave a timer holding a stale setState.
  useEffect(() => release, []);

  /**
   * While a finger is dragging, refuse the scroll it would otherwise cause.
   * `touch-action` is settled when the gesture begins and cannot be changed
   * from under it, so this is the only lever left once the hold has fired —
   * and it must be a non-passive listener or `preventDefault` is ignored.
   */
  useEffect(() => {
    if (dragging === null) return;
    const block = (e: TouchEvent) => {
      e.preventDefault();
    };
    document.addEventListener("touchmove", block, { passive: false });
    return () => {
      document.removeEventListener("touchmove", block);
    };
  }, [dragging]);

  return {
    dragging,
    itemProps: (id) => ({
      "data-reorder-id": id,
      onPointerDown: (e) => {
        // A step chip carries a resize grip on its edge with a pointer drag of
        // its own (FR-5.9). A press that starts there is retiming a step, not
        // moving one.
        if ((e.target as HTMLElement).closest("[data-grip]")) return;
        const p: Press = {
          id,
          x: e.clientX,
          y: e.clientY,
          armed: false,
          timer: null,
        };
        if (e.pointerType !== "mouse") {
          p.timer = setTimeout(() => {
            if (press.current !== p) return;
            p.armed = true;
            setDragging(id);
          }, HOLD_MS);
        }
        press.current = p;
        // Optional chain: jsdom and older embedders lack pointer capture.
        (e.target as Partial<HTMLElement> & EventTarget).setPointerCapture?.(
          e.pointerId,
        );
      },

      onPointerMove: (e) => {
        const p = press.current;
        if (!p) return;
        const moved = Math.hypot(e.clientX - p.x, e.clientY - p.y);
        if (p.armed) return;
        if (moved <= SLOP_PX) return;
        if (e.pointerType === "mouse") {
          p.armed = true;
          setDragging(p.id);
          return;
        }
        // A finger that moved first is scrolling; let the page have it. The
        // press stays alive so a release still behaves, but with the hold
        // cancelled there is no moment left at which it could arm.
        if (p.timer) clearTimeout(p.timer);
        p.timer = null;
      },

      onPointerUp: (e) => {
        const p = press.current;
        if (p?.armed) {
          const to = itemUnder(e.clientX, e.clientY);
          const next = to === null ? null : movedOrder(ids, p.id, to);
          if (next) onReorder(next);
        }
        release();
      },

      onPointerCancel: release,

      ...(dragging === id ? { "data-dragging": "true" as const } : {}),
    }),
  };
}
