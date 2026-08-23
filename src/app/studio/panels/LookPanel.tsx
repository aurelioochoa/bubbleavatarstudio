// Look panel: surface, colors, eyes, ambient (FR-2, FR-3, FR-7).
import type { Bubble } from "../../../domain/document/types";
import type { Action } from "../store";
import type { MessageKey } from "../../i18n";

export interface PanelProps {
  bubble: Bubble;
  dispatch: React.Dispatch<Action>;
  t: (k: MessageKey) => string;
}

function Slider({
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
        onChange={(e) => {
          onChange(Number(e.target.value));
        }}
        className="w-full accent-[#6c7bff]"
      />
    </label>
  );
}

export function LookPanel({ bubble, dispatch, t }: PanelProps) {
  const s = bubble.body.surface;
  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <h3 className="text-xs font-semibold tracking-wide text-[#9aa0c3] uppercase">
          {t("look.surface")}
        </h3>
        <Slider
          label={t("look.width")}
          value={s.width}
          min={60}
          max={480}
          step={1}
          onChange={(v) => {
            dispatch({ type: "surface/patch", patch: { width: v } });
          }}
        />
        <Slider
          label={t("look.height")}
          value={s.height}
          min={60}
          max={480}
          step={1}
          onChange={(v) => {
            dispatch({ type: "surface/patch", patch: { height: v } });
          }}
        />
        <Slider
          label={t("look.roundness")}
          value={s.roundness}
          min={0}
          max={1}
          onChange={(v) => {
            dispatch({ type: "surface/patch", patch: { roundness: v } });
          }}
        />
        <Slider
          label={t("look.rotation")}
          value={s.rotationDeg}
          min={-180}
          max={180}
          step={1}
          onChange={(v) => {
            dispatch({ type: "surface/patch", patch: { rotationDeg: v } });
          }}
        />
        <Slider
          label={t("look.perspective")}
          value={s.perspective}
          min={0}
          max={1}
          onChange={(v) => {
            dispatch({ type: "surface/patch", patch: { perspective: v } });
          }}
        />
      </section>

      <section className="space-y-2">
        <h3 className="text-xs font-semibold tracking-wide text-[#9aa0c3] uppercase">
          {t("look.colors")}
        </h3>
        <ColorField
          label={t("look.bodyColor")}
          value={bubble.colors.body}
          onChange={(v) => {
            dispatch({ type: "colors/patch", patch: { body: v } });
          }}
        />
        <ColorField
          label={t("look.eyeColor")}
          value={bubble.colors.eyes}
          onChange={(v) => {
            dispatch({ type: "colors/patch", patch: { eyes: v } });
          }}
        />
      </section>

      <section className="space-y-2">
        <h3 className="text-xs font-semibold tracking-wide text-[#9aa0c3] uppercase">
          {t("look.eyes")}
        </h3>
        <Slider
          label={t("look.spacing")}
          value={bubble.restingFace.spacing}
          min={10}
          max={200}
          step={1}
          onChange={(v) => {
            dispatch({ type: "eye/spacing", spacing: v });
          }}
        />
        <label className="flex items-center gap-2 text-xs text-[#e8eaf6]">
          <input
            type="checkbox"
            checked={bubble.restingFace.linked}
            onChange={(e) => {
              dispatch({ type: "eye/linked", linked: e.target.checked });
            }}
          />
          {t("look.linked")}
        </label>
      </section>
    </div>
  );
}

function ColorField({
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
