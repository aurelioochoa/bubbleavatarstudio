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
import { BubbleRail } from "./BubbleRail";
import type { StageMode } from "../stage/StageEngine";
import { createAutosaver, loadDocument } from "../persistence";
import type { MoodSample } from "../../domain/playback/LoopPlayer";

type Tab = "look" | "moods" | "loops" | "share";

export function StudioView() {
  const [state, dispatch] = useStudio();
  const [tab, setTab] = useState<Tab>("look");
  // FR-6.2: playback is a three-state transport, not a boolean.
  const [transport, setTransport] = useState<{
    loopId: string | null;
    mode: StageMode;
  }>({ loopId: null, mode: "stopped" });
  // FR-4.4: picking or editing a mood shows it on the stage straight away.
  const [preview, setPreview] = useState<MoodSample | null>(null);
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

  // FR-6.4: playback follows a bubble switch only when the target kit knows the
  // loop; otherwise it stops cleanly instead of playing something that is gone.
  const playableLoopId = transport.loopId;
  useEffect(() => {
    if (playableLoopId && !kit?.loops.some((l) => l.id === playableLoopId)) {
      setTransport({ loopId: null, mode: "stopped" });
    }
  }, [kit, playableLoopId]);

  const tabs: { id: Tab; label: string }[] = [
    { id: "look", label: t("tab.look") },
    { id: "moods", label: t("tab.moods") },
    { id: "loops", label: t("tab.loops") },
    { id: "share", label: t("tab.share") },
  ];

  if (kit === null) {
    return (
      <div className="grid h-dvh place-items-center bg-stage text-ink">
        {/* docs/05 §3: an empty studio invites the first bubble. */}
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-ink-dim">{t("empty.title")}</p>
          <button
            type="button"
            onClick={() => {
              dispatch({ type: "bubble/add", name: "Bubble" });
            }}
            className="rounded-field bg-primary px-4 py-2 text-sm text-white transition-colors duration-150 ease-out hover:bg-primary-hi"
          >
            + {t("rail.add")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col bg-stage text-ink">
      <header className="flex shrink-0 items-center gap-3 border-b border-line bg-panel px-4 py-2.5">
        <span
          aria-hidden="true"
          className="h-4 w-4 rounded-full bg-gradient-to-br from-primary-hi to-primary"
        />
        <h1 className="text-sm font-semibold tracking-tight">
          {t("app.title")}
        </h1>
        <span className="ml-auto flex items-center gap-1 rounded-field bg-panel-2 p-0.5">
          {(["es", "en"] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => {
                dispatch({ type: "locale", locale: l });
              }}
              aria-pressed={state.doc.locale === l}
              className={`rounded-[6px] px-2 py-0.5 text-xs uppercase transition-colors duration-150 ease-out ${
                state.doc.locale === l
                  ? "bg-primary text-white"
                  : "text-ink-dim hover:text-ink"
              }`}
            >
              {l}
            </button>
          ))}
        </span>
      </header>

      <div className="flex min-h-0 flex-1">
        <BubbleRail
          bubbles={state.doc.bubbles}
          activeId={bubble.id}
          dispatch={dispatch}
          t={t}
        />

        <main className="min-w-0 flex-1">
          <Stage
            bubble={bubble}
            kit={kit}
            loopId={transport.loopId}
            mode={transport.mode}
            preview={preview}
            onPause={() => {
              setTransport((tr) => ({ ...tr, mode: "paused" }));
            }}
          />
        </main>

        <aside className="flex w-90 shrink-0 flex-col border-l border-line bg-panel">
          <div
            role="tablist"
            className="flex shrink-0 gap-0.5 border-b border-line p-2"
          >
            {tabs.map((x) => (
              <button
                key={x.id}
                role="tab"
                type="button"
                aria-selected={tab === x.id}
                onClick={() => {
                  if (x.id !== "moods") setPreview(null);
                  setTab(x.id);
                }}
                className={`min-w-0 flex-1 truncate rounded-field px-2 py-1.5 text-xs transition-colors duration-150 ease-out ${
                  tab === x.id
                    ? "bg-primary text-white"
                    : "text-ink-dim hover:bg-white/6 hover:text-ink"
                }`}
              >
                {x.label}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
          {state.lastError && (
            <p
              role="alert"
              className="rounded-field border border-danger/30 bg-danger/15 px-2.5 py-1.5 text-xs text-danger"
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
            <MoodsPanel
              kit={kit}
              dispatch={dispatch}
              t={t}
              bubble={bubble}
              onPreview={(sample) => {
                setPreview(sample);
                // Manual selection owns the live state (FR-6.1).
                if (sample) {
                  setTransport((tr) =>
                    tr.mode === "playing" ? { ...tr, mode: "paused" } : tr,
                  );
                }
              }}
            />
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
          </div>
        </aside>
      </div>
    </div>
  );
}
