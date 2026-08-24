// Shared inspector chrome (docs/05 §2, §4): collapsible cards and the
// segmented control the panels build their sections from. Kept here so the
// 12–16px radius, the 8px spacing grid and the ≤160ms transition are stated
// once rather than re-typed per panel.
import { useEffect, useId, useRef, useState } from "react";

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

/** Everything the browser will stop on when Tab walks the dialog. */
const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * A modal scoped to its positioned ancestor rather than the viewport, so the
 * mood editor can cover the inspector while leaving the stage visible — the
 * live preview behind it is the point of editing a mood (FR-4.4, docs/05 §2).
 *
 * Focus moves in on open, Tab wraps inside, Escape and the backdrop close.
 */
export function Modal({
  title,
  closeLabel,
  onClose,
  children,
  footer,
}: {
  title: string;
  /** Accessible name of the ✕ — translated by the caller, which holds `t`. */
  closeLabel: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Trailing action row, pinned below the scrollable body. */
  footer?: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const root = ref.current;
      if (!root) return;
      const stops = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (stops.length === 0) return;
      const first = stops[0];
      const last = stops[stops.length - 1];
      // The dialog itself is a focus stop only until the user Tabs; from then
      // on focus cycles through its controls rather than leaving for the page.
      const active = document.activeElement;
      if (e.shiftKey ? active === first || active === root : active === last) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div className="absolute inset-0 z-30 flex items-start justify-center p-3">
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        data-testid="modal-backdrop"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-stage/70 backdrop-blur-[2px]"
      />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="relative flex max-h-full w-full flex-col overflow-hidden rounded-card border border-line bg-panel-2 shadow-panel outline-none"
      >
        <div className="flex shrink-0 items-center gap-2 border-b border-line px-3 py-2.5">
          <h2 className="min-w-0 flex-1 truncate text-xs font-semibold tracking-wide text-ink-dim uppercase">
            {title}
          </h2>
          <IconButton label={closeLabel} onClick={onClose}>
            ✕
          </IconButton>
        </div>
        <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-3 py-3">
          {children}
        </div>
        {footer && (
          <div className="flex shrink-0 items-center gap-2 border-t border-line px-3 py-2.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Popover menu for per-item actions. Dismisses on Escape or a press anywhere
 * else — Escape is bound on the document because opening the menu leaves
 * focus on the trigger, which is outside this subtree.
 */
export function Menu({
  label,
  onClose,
  children,
  className = "absolute top-0 left-full z-20 ml-2 w-48",
}: {
  label: string;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: Event) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      role="menu"
      aria-label={label}
      className={`${className} rounded-card border border-line bg-panel-2 p-1.5 shadow-panel`}
    >
      {children}
    </div>
  );
}

export function MenuItem({
  label,
  onClick,
  disabled = false,
  danger = false,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className={`block w-full rounded-field px-2 py-1.5 text-left text-xs transition-colors duration-150 ease-out disabled:opacity-30 ${
        danger
          ? "text-danger hover:bg-danger/15 disabled:hover:bg-transparent"
          : "text-ink hover:bg-white/10 disabled:hover:bg-transparent"
      }`}
    >
      {label}
    </button>
  );
}
