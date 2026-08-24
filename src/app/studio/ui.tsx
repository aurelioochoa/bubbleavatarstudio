// Shared inspector chrome (docs/05 §2, §4): collapsible cards and the
// segmented control the panels build their sections from. Kept here so the
// 12–16px radius, the 8px spacing grid and the ≤160ms transition are stated
// once rather than re-typed per panel.
import { useId, useState } from "react";

export function Card({
  title,
  children,
  defaultOpen = true,
  aside,
}: {
  title: string;
  children: React.ReactNode;
  /** Sections open by default; the user collapses what they are not using. */
  defaultOpen?: boolean;
  /** Optional trailing control rendered in the header, outside the toggle. */
  aside?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = useId();
  return (
    <section className="overflow-hidden rounded-card border border-line bg-panel-2 shadow-panel">
      <div className="flex items-center">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => {
            setOpen((v) => !v);
          }}
          className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2.5 text-left transition-colors duration-150 ease-out hover:bg-white/6"
        >
          <Chevron open={open} />
          <span className="truncate text-xs font-semibold tracking-wide text-ink-dim uppercase">
            {title}
          </span>
        </button>
        {aside && <div className="shrink-0 pr-2">{aside}</div>}
      </div>
      {open && (
        <div id={bodyId} className="space-y-2.5 border-t border-line px-3 py-3">
          {children}
        </div>
      )}
    </section>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 12 12"
      aria-hidden="true"
      className={`h-3 w-3 shrink-0 text-ink-dim transition-transform duration-150 ease-out ${
        open ? "rotate-90" : ""
      }`}
    >
      <path
        d="M4 2.5 8 6l-4 3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Radio-group segmented control; the documented shape for small enum picks. */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex gap-0.5 rounded-field bg-panel p-0.5"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => {
            onChange(o.value);
          }}
          className={`min-w-0 flex-1 truncate rounded-[6px] px-2 py-1 text-xs transition-colors duration-150 ease-out ${
            value === o.value
              ? "bg-primary text-white"
              : "text-ink-dim hover:bg-white/6 hover:text-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Small square control for row-level actions (reorder, remove, kebab). */
export function IconButton({
  label,
  onClick,
  children,
  disabled = false,
  danger = false,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`grid h-7 w-7 shrink-0 place-items-center rounded-field text-xs transition-colors duration-150 ease-out disabled:opacity-30 ${
        danger
          ? "text-danger hover:bg-danger/15"
          : "text-ink-dim hover:bg-white/10 hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * A range input whose filled portion tracks its value. The browser's own
 * unfilled track renders light on these panels, so `styles.css` paints it as a
 * gradient and this sets the stop position — keeping both a dark track and the
 * fill affordance. Everything else about the control stays native.
 */
export function RangeInput({
  label,
  value,
  min,
  max,
  step,
  onChange,
  className = "",
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  className?: string;
}) {
  const span = max - min;
  const pct = span === 0 ? 0 : ((value - min) / span) * 100;
  const fill = Math.min(100, Math.max(0, pct));
  return (
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
      style={{ "--range-fill": `${String(fill)}%` } as React.CSSProperties}
      className={className}
    />
  );
}
