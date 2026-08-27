// The phone inspector's bottom sheet (FR-12.3).
//
// Three heights rather than free positioning: a sheet that stops wherever the
// finger left it makes every session's layout slightly different, and the
// panels below are built for a handful of shapes, not a continuum.
//
// The cap on the tall detent is the load-bearing number here. FR-4.4 says a
// mood is judged against the character, which is why the mood editor is a
// modal scoped to the inspector rather than one covering the window (docs/05
// §2); a sheet that could reach the top of the screen would undo that on a
// phone by another route. So `tall` stops short, and `Sheet.test.tsx` asserts
// it as a product rule rather than a styling preference.
import { useRef, useState } from "react";

export type Detent = "handle" | "half" | "tall";

/**
 * Height of the sheet at each detent, as a fraction of the studio area.
 *
 * `tall` is capped at 0.68 by measurement rather than by taste: above it the
 * stage is short enough that the status pill and the zoom pill between them
 * cover the character, which passes every "is the stage visible" check and
 * fails FR-12.3. The e2e case samples the render itself for that reason.
 */
export const DETENTS: Record<Detent, number> = {
  handle: 0.14,
  half: 0.5,
  tall: 0.68,
};

const ORDER: Detent[] = ["handle", "half", "tall"];

/**
 * Movement past which a press was a drag and not a tap. Only used to decide
 * whether the click that follows a pointer sequence should also cycle the
 * sheet — the snap itself needs no threshold, because a small drag simply
 * lands nearest the detent it started from.
 */
const DRAGGED_PX = 6;

export interface SheetProps {
  detent: Detent;
  onDetent: (detent: Detent) => void;
  /** Names the sheet itself. */
  label: string;
  /** Names the grip, which is both the drag handle and the button. */
  gripLabel: string;
  /** The sheet's own element, which is what inspector overlays portal into. */
  onHost?: (el: HTMLElement | null) => void;
  children: React.ReactNode;
}

/** The viewport, which is what a bottom-anchored sheet is measured against. */
function viewportHeight(): number {
  return globalThis.innerHeight || 1;
}

/** The detent whose height is closest to `fraction`. */
function nearest(fraction: number): Detent {
  let best = ORDER[0];
  for (const d of ORDER) {
    if (Math.abs(DETENTS[d] - fraction) < Math.abs(DETENTS[best] - fraction))
      best = d;
  }
  return best;
}

export function Sheet({
  detent,
  onDetent,
  label,
  gripLabel,
  onHost,
  children,
}: SheetProps) {
  /** Where the finger has taken it, mid-drag; null when the detent decides. */
  const [dragged, setDragged] = useState<number | null>(null);
  const from = useRef<{ y: number; fraction: number } | null>(null);
  /** A click always follows a pointer sequence; after a drag it must not also
   *  cycle the sheet the drag just moved. */
  const swallowClick = useRef(false);

  const fraction = dragged ?? DETENTS[detent];

  const onPointerDown = (e: React.PointerEvent) => {
    from.current = { y: e.clientY, fraction: DETENTS[detent] };
    swallowClick.current = false;
    // Optional chain: jsdom and older embedders lack pointer capture.
    (e.target as Partial<HTMLElement> & EventTarget).setPointerCapture?.(
      e.pointerId,
    );
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const start = from.current;
    if (!start) return;
    const moved = start.y - e.clientY;
    if (Math.abs(moved) > DRAGGED_PX) swallowClick.current = true;
    // Up is taller: the sheet grows from the bottom edge of the screen.
    const next = start.fraction + moved / viewportHeight();
    setDragged(Math.min(DETENTS.tall, Math.max(DETENTS.handle, next)));
  };

  const onPointerUp = () => {
    const landed = dragged;
    from.current = null;
    setDragged(null);
    if (landed === null) return;
    const to = nearest(landed);
    if (to !== detent) onDetent(to);
  };

  /** The path that needs no pointer at all (docs/05 §3): press to go up a
   *  detent, and round from the top back to the handle. */
  const cycle = () => {
    if (swallowClick.current) {
      swallowClick.current = false;
      return;
    }
    const at = ORDER.indexOf(detent);
    onDetent(ORDER[(at + 1) % ORDER.length]);
  };

  return (
    <section
      data-testid="sheet"
      aria-label={label}
      ref={onHost}
      style={{ height: `${String(fraction * 100)}%` }}
      /* `relative` for the same reason the inspector column has it: the mood
         editor is a modal scoped to this box (docs/05 §2). */
      className={`relative z-20 flex shrink-0 flex-col overflow-hidden rounded-t-card border-t border-line bg-panel shadow-dock ${
        dragged === null ? "transition-[height] duration-150 ease-panel" : ""
      }`}
    >
      <button
        type="button"
        aria-label={gripLabel}
        onClick={cycle}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="grid h-11 w-full shrink-0 cursor-grab touch-none place-items-center active:cursor-grabbing"
      >
        <span aria-hidden="true" className="h-1 w-9 rounded-full bg-outline" />
      </button>
      {children}
    </section>
  );
}
