// Moods panel: relative per-eye deltas + color overrides (FR-4). Edits are
// cancelable: the editor works on a draft until committed.
import { useState } from "react";
import { moodScene } from "../../../render/scene";
import { sceneToSvg } from "../../../render/svg";
import type { Bubble, Kit, MoodEye } from "../../../domain/document/types";
import type { MoodSample } from "../../../domain/playback/LoopPlayer";
import type { Action } from "../store";
import type { MessageKey } from "../../i18n";

export interface MoodsPanelProps {
  kit: Kit;
  bubble: Bubble;
  dispatch: React.Dispatch<Action>;
  t: (k: MessageKey) => string;
  /** Shows a mood on the stage while it is picked or edited (FR-4.4). */
  onPreview: (sample: MoodSample | null) => void;
}

const MOOD_KEYS: (keyof MoodEye)[] = [
  "rotationZDeg",
  "scaleX",
  "scaleY",
  "offsetX",
  "offsetY",
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
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {kit.moods.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => {
              select(m.id);
            }}
            className={`flex w-[4.5rem] flex-col items-center gap-1 rounded-lg p-1.5 text-[10px] ${
              m.id === selected
                ? "bg-[#6c7bff] text-white"
                : "bg-white/5 text-[#e8eaf6]"
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
          className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-lg border border-dashed border-white/20 text-xs text-[#9aa0c3]"
        >
          + {t("moods.add")}
        </button>
      </div>

      {mood && current && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold tracking-wide text-[#9aa0c3] uppercase">
            {mood.name}
          </h3>
          {MOOD_KEYS.map((k) => (
            <label key={k} className="block text-xs">
              <span className="flex justify-between text-[#9aa0c3]">
                {k}
                <span className="tabular-nums text-[#e8eaf6]">
                  {String(current[k])}
                </span>
              </span>
              <input
                type="range"
                min={
                  k.startsWith("scale")
                    ? 0.1
                    : k.startsWith("offset")
                      ? -100
                      : -30
                }
                max={
                  k.startsWith("scale") ? 3 : k.startsWith("offset") ? 100 : 30
                }
                step={0.05}
                value={current[k]}
                onChange={(e) => {
                  const next = { ...current, [k]: Number(e.target.value) };
                  setDraft(next);
                  onPreview(sampleOf(next, colorDraft ?? null));
                }}
                className="w-full accent-[#6c7bff]"
              />
            </label>
          ))}
          <label className="flex items-center justify-between text-xs text-[#e8eaf6]">
            {t("moods.colorOverride")}
            <input
              type="color"
              value={colorDraft ?? mood.colorOverride?.body ?? "#6c7bff"}
              onChange={(e) => {
                setColorDraft(e.target.value);
                onPreview(sampleOf(current, e.target.value));
              }}
              className="h-7 w-12 cursor-pointer rounded border border-white/10 bg-transparent"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={commit}
              className="rounded bg-[#6c7bff] px-3 py-1.5 text-xs text-white"
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
              className="rounded bg-white/5 px-3 py-1.5 text-xs text-[#e8eaf6]"
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              onClick={() => {
                dispatch({ type: "mood/remove", moodId: mood.id });
                setSelected(
                  kit.moods.find((m) => m.id !== mood.id)?.id ?? null,
                );
              }}
              className="ml-auto rounded bg-red-500/20 px-3 py-1.5 text-xs text-red-300"
            >
              {t("common.remove")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
