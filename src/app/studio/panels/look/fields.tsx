// Shared inspector fields (docs/05 §3): every numeric input carries a label,
// a unit suffix and native ↑↓ steppers with arrow-key support — plus
// drag-to-scrub on the label itself (FR-9.5).
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
    <label className="flex items-center justify-between gap-2 text-xs text-ink-dim">
      <span
        data-testid={`scrub-${label}`}
        className="min-w-0 cursor-ew-resize touch-none truncate select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endScrub}
        onPointerCancel={endScrub}
      >
        {label}
      </span>
      <span className="flex shrink-0 items-center gap-1">
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
          className="w-20 rounded-field border border-line bg-panel px-2 py-1 text-right tabular-nums text-ink"
        />
        {unit && <span className="w-3 text-[10px] text-ink-dim">{unit}</span>}
      </span>
    </label>
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
    <label className="flex items-center justify-between text-xs text-ink">
      {label}
      <input
        type="color"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
        }}
        className="h-7 w-12 cursor-pointer rounded-field border border-line bg-panel"
        aria-label={label}
      />
    </label>
  );
}
