// The phone's transport (FR-6.2, FR-12.2): play, pause, stop and where the
// loop is, as a pill on the stage.
//
// The full track is a band under three columns carrying a laid-out sequence
// (FR-6.6). At 360px there is no width for the strip and no height to spend on
// a band, and taking one would push the stage below the 40% FR-12.2 keeps for
// it. So the phone splits the track's two jobs: the transport rides the stage
// where it is reachable from every tab, and laying a sequence out belongs to
// the Loops panel in the sheet.
//
// It sits in the sheet rather than on the stage. As a stage overlay it covered
// the character whenever the sheet was pulled up and the stage was short — the
// one moment FR-12.3 is about — so it lives above the tab strip instead, where
// it is reachable from every tab and costs the stage nothing.
import { summarizeLoop } from "../../../domain/playback/summary";
import type { Kit } from "../../../domain/document/types";
import type { MessageKey } from "../../i18n";
import type { StageMode } from "../../stage/StageEngine";

export interface PhoneTransportProps {
  kit: Kit;
  loopId: string | null;
  mode: StageMode;
  t: (k: MessageKey) => string;
  onPlay: (loopId: string) => void;
  onPause: () => void;
  onStop: () => void;
}

const s2 = (ms: number) => (ms / 1000).toFixed(2);

export function PhoneTransport({
  kit,
  loopId,
  mode,
  t,
  onPlay,
  onPause,
  onStop,
}: PhoneTransportProps) {
  // A bubble switch can leave the selection on another kit's loop (FR-6.4).
  const loop =
    kit.loops.find((l) => l.id === loopId) ?? kit.loops.at(0) ?? null;
  if (loop === null) return null;

  const playing = mode === "playing";

  return (
    <div
      data-testid="phone-transport"
      className="flex shrink-0 items-center gap-2 border-b border-line-soft px-3 pb-2"
    >
      <button
        type="button"
        aria-label={playing ? t("common.pause") : t("common.play")}
        onClick={() => {
          if (playing) onPause();
          else onPlay(loop.id);
        }}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary text-white transition-colors duration-150 ease-out hover:bg-primary-hi"
      >
        {playing ? <PauseIcon /> : <PlayIcon />}
      </button>
      <button
        type="button"
        aria-label={t("common.stop")}
        onClick={onStop}
        disabled={mode === "stopped"}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink-dim transition-colors duration-150 ease-out hover:bg-white/10 hover:text-ink disabled:opacity-35"
      >
        <StopIcon />
      </button>
      <span className="min-w-0 flex-1 truncate text-xs text-ink">
        {loop.name}
      </span>
      <span className="shrink-0 text-[10.5px] tabular-nums text-ink-mute">
        {s2(summarizeLoop(loop).totalMs)} s
      </span>
    </div>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
      <path d="M4.5 3.2 12.4 8l-7.9 4.8Z" fill="currentColor" />
    </svg>
  );
}
function PauseIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
      <rect x="4" y="3.2" width="3" height="9.6" rx="1" fill="currentColor" />
      <rect x="9" y="3.2" width="3" height="9.6" rx="1" fill="currentColor" />
    </svg>
  );
}
function StopIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3 w-3" aria-hidden="true">
      <rect x="3.5" y="3.5" width="9" height="9" rx="1.5" fill="currentColor" />
    </svg>
  );
}
