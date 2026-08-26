// Shared inspector fields (docs/05 §3): every numeric input carries a label,
// a unit suffix and native ↑↓ steppers with arrow-key support — plus
// drag-to-scrub on the label itself (FR-9.5).
//
// The label sits above the box rather than beside it, so two fields fit a row
// of the 360px column and a long label ("Profundidad") stops squeezing the
// number it belongs to. The value is right-aligned and tabular: changing one
// field must not shift the digits of the one next to it.
import { useRef } from "react";
import type { Bubble } from "../../../../domain/document/types";
import type { Action } from "../../store";
import type { MessageKey } from "../../../i18n";
import { RangeInput } from "../../ui";

export interface SectionProps {
  bubble: Bubble;
  dispatch: React.Dispatch<Action>;
  t: (k: MessageKey) => string;
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold tracking-wide text-ink-dim uppercase">
      {children}
    </h3>
  );
}

/** Pixels of horizontal travel that advance the field by one of its steps. */
const SCRUB_PX_PER_STEP = 4;

/**
 * Snap to the step grid and drop the float dust multiplying by a fractional
 * step leaves behind — 1.1, never 1.1000000000000001, which would reach the
 * document and then a golden.
 */
function quantize(value: number, step: number): number {
  const decimals = (String(step).split(".")[1] ?? "").length;
  return Number(value.toFixed(decimals));
}

export function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  // The field is controlled by props, so a drag seeds from the value it was
  // handed when the drag began rather than accumulating across moves.
  const scrub = useRef<{ x: number; from: number } | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    scrub.current = { x: e.clientX, from: value };
    // Optional chain: jsdom and older embedders lack pointer capture.
    (e.target as Partial<HTMLElement> & EventTarget).setPointerCapture?.(
      e.pointerId,
    );
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const s = scrub.current;
    if (!s) return;
    const steps = Math.round((e.clientX - s.x) / SCRUB_PX_PER_STEP);
    let next = s.from + steps * step;
    if (min !== undefined) next = Math.max(min, next);
    if (max !== undefined) next = Math.min(max, next);
    onChange(quantize(next, step));
  };

  const endScrub = () => {
    scrub.current = null;
  };

  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span
        data-testid={`scrub-${label}`}
        className="flex cursor-ew-resize touch-none items-center gap-1 truncate text-[10px] text-ink-dim select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endScrub}
        onPointerCancel={endScrub}
      >
        <span className="truncate">{label}</span>
        <ScrubIcon />
      </span>
      <span className="flex h-7 items-center rounded-field border border-line bg-stage pr-1.5 pl-2">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          aria-label={label}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (Number.isFinite(v)) onChange(v);
          }}
          className="min-w-0 flex-1 bg-transparent text-right text-xs tabular-nums text-ink outline-none"
        />
        <span className="w-3 shrink-0 text-right text-[9.5px] text-ink-dim">
          {unit ?? ""}
        </span>
      </span>
    </label>
  );
}

/** The double chevron that says a label can be dragged (FR-9.5). */
function ScrubIcon() {
  return (
    <svg viewBox="0 0 12 8" className="h-1.5 w-2 shrink-0" aria-hidden="true">
      <path
        d="M4.2 1.6 1.7 4l2.5 2.4M7.8 1.6 10.3 4 7.8 6.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 0.01,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block text-xs">
      <span className="flex justify-between text-ink-dim">
        {label}
        <span className="tabular-nums text-ink">
          {String(Math.round(value * 100) / 100)}
        </span>
      </span>
      <RangeInput
        label={label}
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={onChange}
        className="mt-1 w-full"
      />
    </label>
  );
}

/**
 * One colour channel as a column: what it is, the colour itself at the width
 * of the column, and the hex under it. The hex is the part that makes two
 * near-identical swatches distinguishable, and it was not shown at all while
 * the swatch was a 48px chip beside a label.
 */
export function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="truncate text-[10px] text-ink-dim">{label}</span>
      {/* The hairline is a sibling rather than a border on the input: a
          colour close to the panel's own — a near-black eye — would otherwise
          read as an empty box rather than as a swatch. */}
      <span className="relative block h-7.5 w-full">
        <input
          type="color"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
          }}
          className="h-full w-full cursor-pointer rounded-field border-0 bg-transparent p-0"
          aria-label={label}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-field shadow-[inset_0_0_0_1px_rgb(255_255_255/0.16)]"
        />
      </span>
      <span className="text-[9.5px] tabular-nums text-ink-dim uppercase">
        {value}
      </span>
    </label>
  );
}
