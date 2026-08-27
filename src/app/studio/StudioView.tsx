// StudioView: the studio's state, and the shell that arranges it (docs/05,
// FR-12.1). Every piece of view state lives here; where it is drawn is the
// shell's business, which is what lets three layouts share one studio.
import { useEffect, useMemo, useState } from "react";
import { translator, type MessageKey } from "../i18n";
import { effectiveKit } from "../../domain/document/mutate";
import { useStudio } from "./store";
import { BubbleMark } from "./BubbleMark";
import { HelpSheet } from "./help/HelpSheet";
import { useBreakpoint } from "../useMediaQuery";
import { DesktopShell } from "./shell/DesktopShell";
import { PhoneShell } from "./shell/PhoneShell";
import { TabletShell } from "./shell/TabletShell";
import type { ShellProps, Tab } from "./shell/props";
import { createStageClock } from "../stage/clock";
import type { StageMode } from "../stage/StageEngine";
import { createAutosaver, loadDocument } from "../persistence";
import type { MoodSample } from "../../domain/playback/LoopPlayer";

export function StudioView() {
  const [state, dispatch] = useStudio();
  // FR-12.1: which of the three arrangements this window gets.
  const at = useBreakpoint();
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
  const [trackCollapsed, setTrackCollapsed] = useState(at !== "desktop");
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

  /**
   * Switching tabs carries two side effects the strip itself should not know
   * about: leaving Moods drops the preview, because it is that panel's live
   * state and nothing else's (FR-6.1), and Share folds the track away, since
   * it is not editing a sequence (FR-6.6).
   */
  const openTab = (next: Tab) => {
    if (next !== "moods") setPreview(null);
    setTab(next);
    setTrackCollapsed(next === "share");
  };

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

  /**
   * Everything a shell arranges, in one bag (FR-12.1). The state stays here;
   * the shell decides only where it is drawn, which is what lets a second and
   * third arrangement exist without a second copy of any of this.
   */
  const shell: ShellProps = {
    doc: state.doc,
    bubble,
    kit,
    dispatch,
    t,
    lastError: state.lastError,
    tab,
    onTab: openTab,
    mode: transport.mode,
    selectedLoopId,
    selectedStepId,
    preview,
    head,
    zoom,
    trackCollapsed,
    clock,
    onPlay: play,
    onPause: pause,
    onStop: stop,
    onSelectLoop: selectLoop,
    onSelectStep: setSelectedStepId,
    onScrub: scrub,
    onPreview: (sample) => {
      setPreview(sample);
      // Manual selection owns the live state (FR-6.1).
      if (sample) {
        setTransport((tr) =>
          tr.mode === "playing" ? { ...tr, mode: "paused" } : tr,
        );
      }
    },
    onHead: setHead,
    onZoom: setZoom,
    onToggleTrackCollapsed: () => {
      setTrackCollapsed((v) => !v);
    },
    overlayHost: inspector,
    onOverlayHost: setInspector,
    stageHost,
    onStageHost: setStageHost,
  };

  return (
    <div className="flex h-dvh flex-col bg-stage text-ink">
      {/* The title truncates rather than wrapping: at 390px it wrapped to
          three lines and took 80px of height the stage needs (FR-12.2). */}
      <header className="flex shrink-0 items-center gap-2 border-b border-line bg-panel px-3 py-2 md:gap-3 md:px-4 md:py-2.5">
        <BubbleMark size={28} />
        <h1 className="min-w-0 truncate text-sm font-semibold tracking-tight">
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
              className={`touch-target rounded-[6px] px-2 py-0.5 text-xs uppercase transition-colors duration-150 ease-out ${
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

      {at === "phone" && <PhoneShell {...shell} />}
      {at === "tablet" && <TabletShell {...shell} />}
      {at === "desktop" && <DesktopShell {...shell} />}

      {help && (
        <HelpSheet
          t={t}
          onClose={() => {
            setHelp(false);
          }}
        />
      )}
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
