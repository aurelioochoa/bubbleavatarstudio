// Moods panel: relative per-eye deltas + color overrides (FR-4). Edits are
// cancelable: the editor works on a draft until committed.
import { useState } from "react";
import type { Kit, MoodEye } from "../../../domain/document/types";
import type { Action } from "../store";
import type { MessageKey } from "../../i18n";

export interface MoodsPanelProps {
  kit: Kit;
  dispatch: React.Dispatch<Action>;
  t: (k: MessageKey) => string;
}

const MOOD_KEYS: (keyof MoodEye)[] = [
  "rotationZDeg",
  "scaleX",
  "scaleY",
  "offsetX",
  "offsetY",
];

export function MoodsPanel({ kit, dispatch, t }: MoodsPanelProps) {
  const [selected, setSelected] = useState<string | null>(
    kit.moods[0]?.id ?? null,
  );
  const [draft, setDraft] = useState<MoodEye | null>(null);
  const [colorDraft, setColorDraft] = useState<string | null>(null);
  const mood = kit.moods.find((m) => m.id === selected) ?? null;

  const select = (id: string) => {
    setSelected(id);
    setDraft(null);
    setColorDraft(null);
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
            className={`rounded-full px-3 py-1 text-xs ${
              m.id === selected
                ? "bg-[#6c7bff] text-white"
                : "bg-white/5 text-[#e8eaf6]"
            }`}
          >
            {m.name}
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
          className="rounded-full border border-dashed border-white/20 px-3 py-1 text-xs text-[#9aa0c3]"
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
                  setDraft({ ...current, [k]: Number(e.target.value) });
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
