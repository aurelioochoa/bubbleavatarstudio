// Shared inspector fields (docs/05 §3): every numeric input carries a label,
// a unit suffix and native ↑↓ steppers with arrow-key support.
import type { Bubble } from "../../../../domain/document/types";
import type { Action } from "../../store";
import type { MessageKey } from "../../../i18n";

export interface SectionProps {
  bubble: Bubble;
  dispatch: React.Dispatch<Action>;
  t: (k: MessageKey) => string;
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold tracking-wide text-[#9aa0c3] uppercase">
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
    <label className="flex items-center justify-between gap-2 text-xs text-[#9aa0c3]">
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
          className="w-20 rounded bg-white/5 px-1.5 py-1 text-right tabular-nums text-[#e8eaf6]"
        />
        {unit && <span className="w-3 text-[10px]">{unit}</span>}
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
      <span className="flex justify-between text-[#9aa0c3]">
        {label}
        <span className="tabular-nums text-[#e8eaf6]">
          {String(Math.round(value * 100) / 100)}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={(e) => {
          onChange(Number(e.target.value));
        }}
        className="w-full accent-[#6c7bff]"
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
    <label className="flex items-center justify-between text-xs text-[#e8eaf6]">
      {label}
      <input
        type="color"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
        }}
        className="h-7 w-12 cursor-pointer rounded border border-white/10 bg-transparent"
        aria-label={label}
      />
    </label>
  );
}
