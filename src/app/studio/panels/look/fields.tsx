// Shared inspector fields (docs/05 §3): every numeric input carries a label,
// a unit suffix and native ↑↓ steppers with arrow-key support.
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
  return (
    <label className="flex items-center justify-between gap-2 text-xs text-ink-dim">
      <span className="min-w-0 truncate">{label}</span>
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
