// Moods panel: relative per-eye deltas + color overrides (FR-4). Edits are
// cancelable: the editor works on a draft until committed.
import { useState } from "react";
import { moodScene } from "../../../render/scene";
import { sceneToSvg } from "../../../render/svg";
import type { Bubble, Kit, MoodEye } from "../../../domain/document/types";
import type { MoodSample } from "../../../domain/playback/LoopPlayer";
import type { Action } from "../store";
import type { MessageKey } from "../../i18n";
import { Card, RangeInput } from "../ui";

export interface MoodsPanelProps {
  kit: Kit;
  bubble: Bubble;
  dispatch: React.Dispatch<Action>;
  t: (k: MessageKey) => string;
  /** Shows a mood on the stage while it is picked or edited (FR-4.4). */
  onPreview: (sample: MoodSample | null) => void;
}

/** docs/05 §2: each delta shows a translated label and its own range. */
const MOOD_FIELDS: {
  key: keyof MoodEye;
  label: MessageKey;
  min: number;
  max: number;
  step: number;
  unit: string;
}[] = [
  { key: "rotationZDeg", label: "look.eyeRotation", min: -30, max: 30, step: 1, unit: "°" },
  { key: "scaleX", label: "look.scaleX", min: 0.3, max: 2, step: 0.05, unit: "×" },
  { key: "scaleY", label: "look.scaleY", min: 0.3, max: 2, step: 0.05, unit: "×" },
  { key: "offsetX", label: "look.offsetX", min: -40, max: 40, step: 1, unit: "u" },
  { key: "offsetY", label: "look.offsetY", min: -40, max: 40, step: 1, unit: "u" },
];

export function MoodsPanel({
  kit,
  bubble,
  dispatch,
  t,
  onPreview,
}: MoodsPanelProps) {
  const [selected, setSelected] = useState<string | null>(
    kit.moods[0]?.id ?? null,
  );
  const [draft, setDraft] = useState<MoodEye | null>(null);
  const [colorDraft, setColorDraft] = useState<string | null>(null);
  const mood = kit.moods.find((m) => m.id === selected) ?? null;

  /** FR-4.5: cards show the mood on the real character, not an icon. */
  const thumbnail = (sample: MoodSample): string =>
    sceneToSvg(moodScene(bubble, sample), { background: null, size: 44 });

  /** Both eyes take the same delta today; per-eye editing is a later step. */
  const sampleOf = (eye: MoodEye, color: string | null): MoodSample => ({
    left: eye,
    right: eye,
    colorOverride: color === null ? null : { body: color },
  });

  const select = (id: string) => {
    setSelected(id);
    setDraft(null);
    setColorDraft(null);
    const picked = kit.moods.find((m) => m.id === id);
    if (picked) {
      onPreview({
        left: picked.left,
        right: picked.right,
        colorOverride: picked.colorOverride,
      });
    }
  };

  const commit = () => {
    if (!mood) return;
    if (draft) {
      dispatch({
        type: "mood/update",
        moodId: mood.id,
        patch: { left: draft, right: draft },
      });
    }
    if (colorDraft !== null) {
      dispatch({
        type: "mood/update",
        moodId: mood.id,
        patch: {
          colorOverride: colorDraft === "" ? null : { body: colorDraft },
        },
      });
    }
    setDraft(null);
    setColorDraft(null);
  };

  const current = draft ?? mood?.left ?? null;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-1.5">
        {kit.moods.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => {
              select(m.id);
            }}
            className={`flex flex-col items-center gap-1 rounded-field p-1.5 text-[10px] transition-colors duration-150 ease-out ${
              m.id === selected
                ? "bg-primary text-white"
                : "bg-panel-2 text-ink-dim hover:text-ink"
            }`}
          >
            <span
              aria-hidden="true"
              className="pointer-events-none block h-11 w-11"
              dangerouslySetInnerHTML={{
                __html: thumbnail({
                  left: m.left,
                  right: m.right,
                  colorOverride: m.colorOverride,
                }),
              }}
            />
            <span className="w-full truncate text-center">{m.name}</span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            dispatch({
              type: "mood/add",
              name: `mood ${String(kit.moods.length + 1)}`,
            });
          }}
          className="flex min-h-[4.25rem] items-center justify-center rounded-field border border-dashed border-line px-1 text-center text-[10px] leading-tight text-ink-dim transition-colors duration-150 ease-out hover:border-primary hover:text-ink"
        >
          + {t("moods.add")}
        </button>
      </div>

      {mood && current && (
        <>
          <Card title={`${t("moods.deltas")} · ${mood.name}`}>
            {MOOD_FIELDS.map((f) => (
              <label key={f.key} className="block text-xs">
                <span className="flex justify-between text-ink-dim">
                  {t(f.label)}
                  <span className="tabular-nums text-ink">
                    {String(Math.round(current[f.key] * 100) / 100)}
                    {f.unit}
                  </span>
                </span>
                <RangeInput
                  label={t(f.label)}
                  value={current[f.key]}
                  min={f.min}
                  max={f.max}
                  step={f.step}
                  onChange={(v) => {
                    const next = { ...current, [f.key]: v };
                    setDraft(next);
                    onPreview(sampleOf(next, colorDraft ?? null));
                  }}
                  className="mt-1 w-full"
                />
              </label>
            ))}
          </Card>

          <Card title={t("moods.colorOverride")}>
            <div className="flex items-center justify-between gap-2 text-xs text-ink">
              <input
                type="color"
                value={colorDraft ?? mood.colorOverride?.body ?? "#6c7bff"}
                aria-label={t("moods.colorOverride")}
                onChange={(e) => {
                  setColorDraft(e.target.value);
                  onPreview(sampleOf(current, e.target.value));
                }}
                className="h-7 w-12 shrink-0 cursor-pointer rounded-field border border-line bg-panel"
              />
              <button
                type="button"
                onClick={() => {
                  setColorDraft("");
                  onPreview(sampleOf(current, null));
                }}
                className="rounded-field bg-panel px-2.5 py-1.5 text-xs text-ink-dim transition-colors duration-150 ease-out hover:text-ink"
              >
                {t("moods.clearOverride")}
              </button>
            </div>
          </Card>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={commit}
              className="rounded-field bg-primary px-3 py-1.5 text-xs text-white transition-colors duration-150 ease-out hover:bg-primary-hi"
            >
              OK
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft(null);
                setColorDraft(null);
                // FR-4.4: cancelling restores the stage to the saved mood.
                onPreview({
                  left: mood.left,
                  right: mood.right,
                  colorOverride: mood.colorOverride,
                });
              }}
              className="rounded-field bg-panel-2 px-3 py-1.5 text-xs text-ink transition-colors duration-150 ease-out hover:bg-panel-3"
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              onClick={() => {
                dispatch({ type: "mood/duplicate", moodId: mood.id });
              }}
              className="rounded-field bg-panel-2 px-3 py-1.5 text-xs text-ink transition-colors duration-150 ease-out hover:bg-panel-3"
            >
              {t("common.duplicate")}
            </button>
            <button
              type="button"
              onClick={() => {
                // docs/05 §3: destructive actions confirm. A referenced mood
                // is still refused by the reducer afterwards (E_REF, FR-5.6).
                if (!globalThis.confirm(t("confirm.removeMood"))) return;
                dispatch({ type: "mood/remove", moodId: mood.id });
                setSelected(
                  kit.moods.find((m) => m.id !== mood.id)?.id ?? null,
                );
              }}
              className="ml-auto rounded-field bg-danger/15 px-3 py-1.5 text-xs text-danger transition-colors duration-150 ease-out hover:bg-danger/25"
            >
              {t("common.remove")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
