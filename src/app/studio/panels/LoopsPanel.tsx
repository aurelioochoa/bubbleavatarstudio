// Loops panel: steps referencing moods, playback config (FR-5).
import { useState } from "react";
import type {
  Kit,
  PlaybackMode,
  TransitionStyle,
} from "../../../domain/document/types";
import type { Action } from "../store";
import type { MessageKey } from "../../i18n";
import type { StageMode } from "../../stage/StageEngine";

export interface Transport {
  loopId: string | null;
  mode: StageMode;
}

export interface LoopsPanelProps {
  kit: Kit;
  dispatch: React.Dispatch<Action>;
  t: (k: MessageKey) => string;
  transport: Transport;
  onPlay: (loopId: string) => void;
  onPause: () => void;
  onStop: () => void;
}

const MODES: PlaybackMode[] = ["loop", "once", "pingpong"];
const TRANSITIONS: TransitionStyle[] = ["linear", "ease", "spring", "step"];

export function LoopsPanel({
  kit,
  dispatch,
  t,
  transport,
  onPlay,
  onPause,
  onStop,
}: LoopsPanelProps) {
  const [selected, setSelected] = useState<string | null>(
    kit.loops[0]?.id ?? null,
  );
  // Switching bubbles can leave `selected` pointing at another kit's loop;
  // fall back to this kit's first loop rather than showing nothing (FR-6.4).
  const loop =
    kit.loops.find((l) => l.id === selected) ?? kit.loops.at(0) ?? null;
  const playingThis =
    loop !== null &&
    transport.loopId === loop.id &&
    transport.mode === "playing";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {kit.loops.map((l) => (
          <button
            key={l.id}
            type="button"
            onClick={() => {
              setSelected(l.id);
              if (transport.loopId !== l.id) onStop();
            }}
            className={`rounded-full px-3 py-1 text-xs ${
              l.id === selected
                ? "bg-[#6c7bff] text-white"
                : "bg-white/5 text-[#e8eaf6]"
            }`}
          >
            {l.name}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            dispatch({
              type: "loop/add",
              init: { name: `loop ${String(kit.loops.length + 1)}` },
            });
          }}
          className="rounded-full border border-dashed border-white/20 px-3 py-1 text-xs text-[#9aa0c3]"
        >
          + {t("loops.add")}
        </button>
      </div>

      {loop && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (playingThis) onPause();
                else onPlay(loop.id);
              }}
              className="rounded bg-[#6c7bff] px-3 py-1.5 text-xs text-white"
            >
              {playingThis ? t("common.pause") : t("common.play")}
            </button>
            <button
              type="button"
              onClick={onStop}
              disabled={transport.mode === "stopped"}
              className="rounded bg-white/5 px-3 py-1.5 text-xs text-[#e8eaf6] disabled:opacity-40"
            >
              {t("common.stop")}
            </button>
            <select
              value={loop.mode}
              onChange={(e) => {
                dispatch({
                  type: "loop/update",
                  loopId: loop.id,
                  patch: { mode: e.target.value as PlaybackMode },
                });
              }}
              className="rounded bg-white/5 px-2 py-1 text-xs text-[#e8eaf6]"
              aria-label={t("loops.mode")}
            >
              {MODES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <label className="ml-auto flex items-center gap-2 text-xs text-[#9aa0c3]">
              {t("loops.springSpeed")}
              <input
                type="number"
                min={0.1}
                max={3}
                step={0.1}
                value={loop.springSpeed}
                onChange={(e) => {
                  dispatch({
                    type: "loop/update",
                    loopId: loop.id,
                    patch: { springSpeed: Number(e.target.value) },
                  });
                }}
                className="w-16 rounded bg-white/5 px-1 py-0.5 text-xs text-[#e8eaf6]"
              />
            </label>
          </div>

          <ol className="space-y-2">
            {loop.steps.map((s, i) => {
              const moodName =
                kit.moods.find((m) => m.id === s.moodId)?.name ?? "?";
              return (
                <li
                  key={s.id}
                  className="rounded-lg bg-white/5 p-2 text-xs text-[#e8eaf6]"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[#9aa0c3]">{String(i + 1)}</span>
                    <select
                      value={s.moodId}
                      onChange={(e) => {
                        dispatch({
                          type: "step/update",
                          loopId: loop.id,
                          stepId: s.id,
                          patch: { moodId: e.target.value },
                        });
                      }}
                      className="rounded bg-white/10 px-1 py-0.5"
                      aria-label={`${t("moods.name")} ${String(i + 1)}`}
                    >
                      {kit.moods.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={0}
                      max={60000}
                      step={50}
                      value={s.holdMs}
                      onChange={(e) => {
                        dispatch({
                          type: "step/update",
                          loopId: loop.id,
                          stepId: s.id,
                          patch: { holdMs: Number(e.target.value) },
                        });
                      }}
                      className="w-20 rounded bg-white/10 px-1 py-0.5"
                      aria-label={t("loops.holdMs")}
                    />
                    <select
                      value={s.transition}
                      onChange={(e) => {
                        dispatch({
                          type: "step/update",
                          loopId: loop.id,
                          stepId: s.id,
                          patch: {
                            transition: e.target.value as TransitionStyle,
                          },
                        });
                      }}
                      className="rounded bg-white/10 px-1 py-0.5"
                      aria-label={t("loops.transition")}
                    >
                      {TRANSITIONS.map((tr) => (
                        <option key={tr} value={tr}>
                          {tr}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        dispatch({
                          type: "step/remove",
                          loopId: loop.id,
                          stepId: s.id,
                        });
                      }}
                      className="ml-auto text-red-300"
                      aria-label={`${t("common.remove")} ${moodName}`}
                    >
                      ✕
                    </button>
                  </div>
                </li>
              );
            })}
          </ol>

          <div className="flex items-center justify-between">
            <select
              value=""
              onChange={(e) => {
                if (!e.target.value) return;
                dispatch({
                  type: "step/add",
                  loopId: loop.id,
                  step: {
                    moodId: e.target.value,
                    holdMs: 800,
                    transition: "ease",
                  },
                });
              }}
              className="rounded bg-white/5 px-2 py-1 text-xs text-[#e8eaf6]"
              aria-label={t("loops.addStep")}
            >
              <option value="">{t("loops.addStep")}</option>
              {kit.moods.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => {
                dispatch({ type: "loop/remove", loopId: loop.id });
                setSelected(
                  kit.loops.find((l) => l.id !== loop.id)?.id ?? null,
                );
                onStop();
              }}
              className="rounded bg-red-500/20 px-3 py-1 text-xs text-red-300"
            >
              {t("common.remove")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
