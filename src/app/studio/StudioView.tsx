// StudioView: rail / stage / inspector shell (docs/05).
import { useEffect, useMemo, useState } from "react";
import { translator, type MessageKey } from "../i18n";
import { effectiveKit } from "../../domain/document/mutate";
import { Stage } from "../stage/Stage";
import { LookPanel } from "./panels/LookPanel";
import { MoodsPanel } from "./panels/MoodsPanel";
import { LoopsPanel } from "./panels/LoopsPanel";
import { SharePanel } from "./panels/SharePanel";
import { useStudio } from "./store";
import { PanelScroll } from "./ui";
import { BubbleRail } from "./BubbleRail";
import { BubbleMark } from "./BubbleMark";
import { HelpSheet } from "./help/HelpSheet";
import { Track } from "./Track";
import { createStageClock } from "../stage/clock";
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
  // The step the track and the inspector are both talking about (FR-6.7).
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  // The inspector column, so the mood editor can mount over all of it rather
  // than inside the scroll box that would clip it (docs/05 §2).
  const [inspector, setInspector] = useState<HTMLElement | null>(null);
  const [stageHost, setStageHost] = useState<HTMLElement | null>(null);
  /**
   * View state, deliberately not in the document: it changes how big the
   * character is drawn on this screen and nothing a snapshot, the ZIP or the
   * runtime would carry, so it neither autosaves nor survives a reload.
   */
  const [zoom, setZoom] = useState(1);
  // FR-8.1's pose lives here rather than inside Stage: FR-10.1's snapshot is
  // "the current stage", and the Share panel has to draw and export the same
  // pose the stage is holding.
  const [head, setHead] = useState({ x: 0, y: 0, z: 0 });
  // FR-6.6: the Share tab is not editing a sequence, so the track folds to a
  // single row there — kept as state rather than derived from the tab, so a
  // user who opens it back up gets to keep it open.
  const [trackCollapsed, setTrackCollapsed] = useState(false);
  // FR-9.6: autosave is silent, and silence is indistinguishable from
  // failure — so the header says which of the three it is.
  const [saveState, setSaveState] = useState<"saved" | "saving" | "failed">(
    "saved",
  );
  const [help, setHelp] = useState(false);
  const autosaver = useMemo(
    () =>
      createAutosaver(300, (ok) => {
        setSaveState(ok ? "saved" : "failed");
      }),
    [],
  );
  // FR-6.7 / FR-11.2: the engine publishes elapsed time here and the track
  // subscribes; neither the clock nor what rides on it re-renders React.
  const clock = useMemo(() => createStageClock(), []);

  // FR-9: restore on boot, autosave (≤300ms debounce) on change.
  useEffect(() => {
    const stored = loadDocument();
    if (stored) {
      dispatch({ type: "load", doc: stored as never });
    }
  }, []);

  useEffect(() => {
    autosaver.push(state.doc);
    setSaveState("saving");
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

  // docs/05 §1: one loop selection, owned here, drives both the stage dock and
  // the Loops panel. Until the user picks one it is the kit's first loop.
  const selectedLoopId = transport.loopId ?? kit?.loops[0]?.id ?? null;

  const play = (loopId: string) => {
    setPreview(null); // playback takes the live state back from a mood preview
    setTransport({ loopId, mode: "playing" });
  };
  const pause = () => {
    setTransport((tr) => ({ ...tr, mode: "paused" }));
  };
  const stop = () => {
    setTransport((tr) => ({ ...tr, mode: "stopped" }));
  };
  const selectLoop = (loopId: string) => {
    // Switching loops rewinds rather than cutting mid-step (FR-6.2).
    setTransport({ loopId, mode: "stopped" });
    setSelectedStepId(null);
  };
  /**
   * FR-6.7: pressing the timeline moves playback there. A stopped stage shows
   * the resting face and rewinds on every update, so a scrub that left it
   * stopped would do nothing visible; it pauses at the scrubbed position
   * instead, which is what makes the gesture mean something. The preview goes
   * for the same reason play drops it — it would otherwise win the frame and
   * hide the pose just scrubbed to (FR-6.1).
   */
  const scrub = (ms: number) => {
    setPreview(null);
    if (selectedLoopId !== null && transport.mode === "stopped") {
      setTransport({ loopId: selectedLoopId, mode: "paused" });
    }
    clock.seek(ms);
  };

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
        <BubbleMark size={28} />
        <h1 className="text-sm font-semibold tracking-tight">
          {t("app.title")}
        </h1>
        <span aria-hidden="true" className="mx-1 h-4.5 w-px bg-line" />
        <SaveState state={saveState} t={t} />

        <button
          type="button"
          onClick={() => {
            setHelp(true);
          }}
          className="ml-auto flex h-6.5 items-center gap-1.5 rounded-field border border-line px-2.5 text-[11px] text-ink-dim transition-colors duration-150 ease-out hover:border-outline hover:text-ink"
        >
          <HelpIcon />
          {t("header.help")}
        </button>

        <span className="flex items-center gap-1 rounded-field bg-panel-2 p-0.5">
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

        {/* `relative`: the Share panel draws the export frame here, over the
            stage, as a sibling of the engine's host (docs/05 §1).

            The zoom rides as a CSS variable rather than a prop threaded into
            both, because the frame is portalled into this element from a panel
            that knows nothing about the stage: one custom property on their
            common ancestor is what keeps the two the same size, which is the
            whole claim the frame makes (FR-10.6). */}
        <main
          ref={setStageHost}
          className="relative min-w-0 flex-1 overflow-hidden"
          style={{ "--stage-zoom": String(zoom) } as React.CSSProperties}
        >
          <Stage
            bubble={bubble}
            kit={kit}
            loopId={selectedLoopId}
            mode={transport.mode}
            preview={preview}
            t={t}
            clock={clock}
            head={head}
            onHead={setHead}
            zoom={zoom}
            onZoom={setZoom}
            onPause={pause}
          />
        </main>

        {/* `relative`: the mood editor is a modal scoped to this column, so
            the stage stays visible behind it (docs/05 §2). */}
        <aside
          ref={setInspector}
          className="relative flex w-90 shrink-0 flex-col border-l border-line bg-panel"
        >
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
                  setTrackCollapsed(x.id === "share");
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

          <div className="flex min-h-0 flex-1 flex-col">
            {state.lastError && (
              <p
                role="alert"
                className="m-3 mb-0 shrink-0 rounded-field border border-danger/30 bg-danger/15 px-2.5 py-1.5 text-xs text-danger"
              >
                {state.lastError.code === "E_REF"
                  ? t("error.ref")
                  : t("error.generic")}
              </p>
            )}

            {tab === "look" && (
              <PanelScroll>
                <LookPanel bubble={bubble} dispatch={dispatch} t={t} />
              </PanelScroll>
            )}
            {tab === "moods" && (
              <MoodsPanel
                kit={kit}
                dispatch={dispatch}
                t={t}
                bubble={bubble}
                overlayHost={inspector}
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
                selectedLoopId={selectedLoopId}
                onSelectLoop={selectLoop}
                selectedStepId={selectedStepId}
                onSelectStep={setSelectedStepId}
              />
            )}
            {tab === "share" && (
              <PanelScroll>
                <SharePanel
                  bubble={bubble}
                  kit={kit}
                  doc={state.doc}
                  dispatch={dispatch}
                  overlayHost={inspector}
                  stageHost={stageHost}
                  head={head}
                  t={t}
                />
              </PanelScroll>
            )}
          </div>
        </aside>
      </div>

      {help && (
        <HelpSheet
          t={t}
          onClose={() => {
            setHelp(false);
          }}
        />
      )}

      {/* FR-6.6: below all three columns, not floating over one of them. */}
      <Track
        bubble={bubble}
        kit={kit}
        loopId={selectedLoopId}
        mode={transport.mode}
        clock={clock}
        dispatch={dispatch}
        t={t}
        collapsed={trackCollapsed}
        tray={tab === "moods"}
        selectedStepId={selectedStepId}
        onToggleCollapsed={() => {
          setTrackCollapsed((v) => !v);
        }}
        onSelectStep={setSelectedStepId}
        onScrub={scrub}
        onPlay={play}
        onPause={pause}
        onStop={stop}
        onSelectLoop={selectLoop}
      />
    </div>
  );
}

/**
 * FR-9.6: whether the work is on disk.
 *
 * The dot never carries the state alone (docs/05 §3) — the word beside it
 * does, which matters most in the one case worth surfacing: a storage that
 * refuses the write looks exactly like a storage that took it.
 */
function SaveState({
  state,
  t,
}: {
  state: "saved" | "saving" | "failed";
  t: (k: MessageKey) => string;
}) {
  const failed = state === "failed";
  return (
    <span
      role="status"
      data-testid="save-state"
      className={`flex items-center gap-1.5 text-[11px] ${
        failed ? "text-danger" : "text-ink-dim"
      }`}
    >
      {failed ? <AlertIcon /> : <CheckIcon />}
      {t(
        failed
          ? "header.saveFailed"
          : state === "saving"
            ? "header.saving"
            : "header.saved",
      )}
    </span>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-2.5 w-2.5" aria-hidden="true">
      <path
        d="M3 8.4 6.2 11.4 13 4.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function AlertIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3 w-3" aria-hidden="true">
      <circle
        cx="8"
        cy="8"
        r="6.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M8 4.8v3.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="8" cy="11" r="0.9" fill="currentColor" />
    </svg>
  );
}

/** The button opens the whole help sheet now, not only the shortcut list. */
function HelpIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-2.5 w-2.5" aria-hidden="true">
      <circle
        cx="8"
        cy="8"
        r="6.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <path
        d="M6.1 6.2a1.95 1.95 0 1 1 2.5 1.86c-.4.13-.6.44-.6.85v.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <circle cx="8" cy="11.6" r="0.85" fill="currentColor" />
    </svg>
  );
}
