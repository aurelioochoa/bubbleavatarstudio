// StudioView: rail / stage / inspector shell (docs/05).
import { useEffect, useMemo, useState } from "react";
import { translator } from "../i18n";
import { effectiveKit } from "../../domain/document/mutate";
import { Stage } from "../stage/Stage";
import { LookPanel } from "./panels/LookPanel";
import { MoodsPanel } from "./panels/MoodsPanel";
import { LoopsPanel } from "./panels/LoopsPanel";
import { SharePanel } from "./panels/SharePanel";
import { useStudio } from "./store";
import type { StageMode } from "../stage/StageEngine";
import { createAutosaver, loadDocument } from "../persistence";
import type { Locale } from "../../domain/document/types";

type Tab = "look" | "moods" | "loops" | "share";

export function StudioView() {
  const [state, dispatch] = useStudio();
  const [tab, setTab] = useState<Tab>("look");
  // FR-6.2: playback is a three-state transport, not a boolean.
  const [transport, setTransport] = useState<{
    loopId: string | null;
    mode: StageMode;
  }>({ loopId: null, mode: "stopped" });
  const autosaver = useMemo(() => createAutosaver(300), []);

  // FR-9: restore on boot, autosave (≤300ms debounce) on change.
  useEffect(() => {
    const stored = loadDocument();
    if (stored) {
      dispatch({ type: "load", doc: stored as never });
    }
  }, []);

  useEffect(() => {
    autosaver.push(state.doc);
  }, [state.doc, autosaver]);

  // FR-9.2: a reload racing the 300ms debounce must not lose the last edit.
  useEffect(() => {
    const onHide = () => {
      autosaver.flush();
    };
    globalThis.addEventListener("pagehide", onHide);
    return () => {
      globalThis.removeEventListener("pagehide", onHide);
    };
  }, [autosaver]);

  const t = translator(state.doc.locale);
  const empty = state.doc.bubbles.length === 0;
  const bubble =
    state.doc.bubbles.find((b) => b.id === state.doc.activeBubbleId) ??
    state.doc.bubbles[0];
  const kit = empty ? null : effectiveKit(bubble, state.doc);

  const tabs: { id: Tab; label: string }[] = [
    { id: "look", label: t("tab.look") },
    { id: "moods", label: t("tab.moods") },
    { id: "loops", label: t("tab.loops") },
    { id: "share", label: t("tab.share") },
  ];

  if (kit === null) {
    return (
      <div className="grid h-dvh place-items-center bg-[#0b0d16] text-[#e8eaf6]">
        <button
          type="button"
          onClick={() => {
            dispatch({ type: "bubble/add", name: "Bubble" });
          }}
          className="rounded bg-[#6c7bff] px-4 py-2 text-sm text-white"
        >
          {t("rail.add")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col bg-[#0b0d16] text-[#e8eaf6]">
      <header className="flex items-center gap-3 border-b border-white/10 px-4 py-2">
        <h1 className="text-sm font-semibold">{t("app.title")}</h1>
        <select
          value={state.doc.locale}
          onChange={(e) => {
            dispatch({ type: "locale", locale: e.target.value as Locale });
          }}
          className="ml-auto rounded bg-white/5 px-2 py-1 text-xs"
          aria-label="locale"
        >
          <option value="es">es</option>
          <option value="en">en</option>
        </select>
      </header>

      <div className="flex min-h-0 flex-1">
        <nav className="w-44 shrink-0 space-y-2 overflow-y-auto border-r border-white/10 p-3">
          <h2 className="text-xs font-semibold tracking-wide text-[#9aa0c3] uppercase">
            {t("rail.bubbles")}
          </h2>
          {state.doc.bubbles.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => {
                dispatch({ type: "bubble/active", id: b.id });
              }}
              className={`block w-full truncate rounded px-2 py-1.5 text-left text-xs ${
                b.id === bubble.id ? "bg-[#6c7bff] text-white" : "bg-white/5"
              }`}
            >
              {b.name}
            </button>
          ))}
          <div className="flex gap-1 pt-1">
            <button
              type="button"
              onClick={() => {
                dispatch({ type: "bubble/add", name: "Bubble" });
              }}
              className="flex-1 rounded border border-dashed border-white/20 px-2 py-1 text-xs text-[#9aa0c3]"
            >
              + {t("rail.add")}
            </button>
            <button
              type="button"
              onClick={() => {
                dispatch({ type: "bubble/duplicate", id: bubble.id });
              }}
              className="rounded bg-white/5 px-2 py-1 text-xs"
              aria-label={t("common.duplicate")}
            >
              ⧉
            </button>
            <button
              type="button"
              onClick={() => {
                // FR-1.5: deletion requires confirmation.
                if (globalThis.confirm(t("confirm.removeBubble"))) {
                  dispatch({ type: "bubble/remove", id: bubble.id });
                }
              }}
              className="rounded bg-red-500/20 px-2 py-1 text-xs text-red-300"
              aria-label={t("common.remove")}
            >
              ✕
            </button>
          </div>
        </nav>

        <main className="min-w-0 flex-1 bg-[#0b0d16]">
          <Stage
            bubble={bubble}
            kit={kit}
            loopId={transport.loopId}
            mode={transport.mode}
            onPause={() => {
              setTransport((tr) => ({ ...tr, mode: "paused" }));
            }}
          />
        </main>

        <aside className="w-72 shrink-0 space-y-4 overflow-y-auto border-l border-white/10 p-3">
          <div role="tablist" className="flex gap-1">
            {tabs.map((x) => (
              <button
                key={x.id}
                role="tab"
                type="button"
                aria-selected={tab === x.id}
                onClick={() => {
                  setTab(x.id);
                }}
                className={`flex-1 rounded px-2 py-1 text-xs ${
                  tab === x.id
                    ? "bg-[#6c7bff] text-white"
                    : "bg-white/5 text-[#e8eaf6]"
                }`}
              >
                {x.label}
              </button>
            ))}
          </div>

          {state.lastError && (
            <p
              role="alert"
              className="rounded bg-red-500/20 px-2 py-1 text-xs text-red-300"
            >
              {state.lastError.code === "E_REF"
                ? t("error.ref")
                : t("error.generic")}
            </p>
          )}

          {tab === "look" && (
            <LookPanel bubble={bubble} dispatch={dispatch} t={t} />
          )}
          {tab === "moods" && (
            <MoodsPanel kit={kit} dispatch={dispatch} t={t} />
          )}
          {tab === "loops" && (
            <LoopsPanel
              kit={kit}
              dispatch={dispatch}
              t={t}
              transport={transport}
              onPlay={(loopId) => {
                setTransport({ loopId, mode: "playing" });
              }}
              onPause={() => {
                setTransport((tr) => ({ ...tr, mode: "paused" }));
              }}
              onStop={() => {
                setTransport((tr) => ({ ...tr, mode: "stopped" }));
              }}
            />
          )}
          {tab === "share" && (
            <SharePanel
              bubble={bubble}
              kit={kit}
              doc={state.doc}
              dispatch={dispatch}
              t={t}
            />
          )}
        </aside>
      </div>
    </div>
  );
}
