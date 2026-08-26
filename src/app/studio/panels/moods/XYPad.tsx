// A two-axis offset, edited as one place (FR-4.1).
//
// A mood's `offsetX`/`offsetY` are two numbers that mean one thing — where the
// eye sits — and the editor used to ask for them as two of fourteen stacked
// sliders. Dragging a dot is the same edit with the relationship visible.
//
// The pad is a *pointer* affordance and nothing more. The two range inputs
// under it are what keyboard and screen-reader users operate; they are hidden
// rather than absent, because a div that swallows arrow keys is not a control.
import { useRef } from "react";

export interface XYPadProps {
  /** Names the pair; each axis slider is labelled "<label> · <axis>". */
  label: string;
  /**
   * Accessible names for the two axes. The readout under the pad shows "X"
   * and "Y" regardless: those are the axis letters the artboard uses and the
   * only thing that fits, while the sliders need a name that stands alone.
   */
  xLabel: string;
  yLabel: string;
  x: number;
  y: number;
  /** Half-span of both axes: the pad covers −range…+range. */
  range: number;
  onChange: (x: number, y: number) => void;
}

/** Fraction of the pad a value sits at, 0..1, with the origin in the middle. */
const toFraction = (v: number, range: number): number => (v / range + 1) / 2;

const clamp = (v: number, range: number): number =>
  Math.max(-range, Math.min(range, v));

export function XYPad({
  label,
  xLabel,
  yLabel,
  x,
  y,
  range,
  onChange,
}: XYPadProps) {
  const padRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const fromPointer = (clientX: number, clientY: number) => {
    const box = padRef.current?.getBoundingClientRect();
    if (!box || box.width <= 0 || box.height <= 0) return;
    const at = (px: number, origin: number, span: number) =>
      Math.round(clamp(((px - origin) / span) * 2 * range - range, range));
    onChange(
      at(clientX, box.left, box.width),
      // Screen y grows downward and so does offsetY, so no flip: a dot dragged
      // up is a negative offset, which is where the render puts it too.
      at(clientY, box.top, box.height),
    );
  };

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    // Optional chain: jsdom and older embedders lack pointer capture.
    (e.target as Partial<HTMLElement> & EventTarget).setPointerCapture?.(
      e.pointerId,
    );
    fromPointer(e.clientX, e.clientY);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (dragging.current) fromPointer(e.clientX, e.clientY);
  };

  const endDrag = () => {
    dragging.current = false;
  };

  const pct = (v: number) =>
    `${String(Math.round(toFraction(v, range) * 10000) / 100)}%`;

  return (
    <div className="flex flex-col gap-1.5">
      <div
        ref={padRef}
        data-testid="xy-pad"
        role="presentation"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="relative h-26 touch-none overflow-hidden rounded-field border border-line bg-stage"
      >
        {/* Quarters, then the centre lines on top of them. */}
        {[25, 75].map((at) => (
          <span key={`q${String(at)}`} aria-hidden="true">
            <span
              style={{ top: `${String(at)}%` }}
              className="absolute inset-x-0 h-px bg-line-soft/60"
            />
            <span
              style={{ left: `${String(at)}%` }}
              className="absolute inset-y-0 w-px bg-line-soft/60"
            />
          </span>
        ))}
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-1/2 h-px bg-line-soft"
        />
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-1/2 w-px bg-line-soft"
        />

        <span
          data-testid="xy-dot"
          aria-hidden="true"
          style={{ left: pct(x), top: pct(y) }}
          className="absolute -mt-1.5 -ml-1.5 h-3 w-3 rounded-full bg-brand shadow-[0_0_0_4px_rgb(108_123_255/0.22)]"
        />
        <span
          aria-hidden="true"
          className="absolute right-1.5 bottom-1 text-[8px] text-ink-mute"
        >
          ±{range} u
        </span>
      </div>

      <span className="sr-only">
        <input
          type="range"
          min={-range}
          max={range}
          step={1}
          value={x}
          aria-label={`${label} · ${xLabel}`}
          onChange={(e) => {
            onChange(Number(e.target.value), y);
          }}
        />
        <input
          type="range"
          min={-range}
          max={range}
          step={1}
          value={y}
          aria-label={`${label} · ${yLabel}`}
          onChange={(e) => {
            onChange(x, Number(e.target.value));
          }}
        />
      </span>

      <span className="flex justify-between text-[9.5px] tabular-nums text-ink-dim">
        <span>
          X <span className="text-ink">{x}</span>
        </span>
        <span>
          Y <span className="text-ink">{y}</span>
        </span>
      </span>
    </div>
  );
}
