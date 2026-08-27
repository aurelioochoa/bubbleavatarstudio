// The state surface a shell arranges (FR-12.1).
//
// `StudioView` owns every field here and none of the layout; a shell owns the
// layout and none of the state. That split is what lets three arrangements of
// the same studio exist without three copies of its behaviour — and it is why
// this interface is wide: it is not a component's props so much as the studio's
// working set, written down once.
import type { Dispatch } from "react";
import type {
  Bubble,
  HeadPose,
  Kit,
  StudioDocument,
} from "../../../domain/document/types";
import type { MoodSample } from "../../../domain/playback/LoopPlayer";
import type { MessageKey } from "../../i18n";
import type { StageClock } from "../../stage/clock";
import type { StageMode } from "../../stage/StageEngine";
import type { Action, StudioState } from "../store";

export type Tab = "look" | "moods" | "loops" | "share";

export interface ShellProps {
  doc: StudioDocument;
  /** The bubble every panel is talking about; never null — an empty document
   *  never reaches a shell (`StudioView` shows the empty state instead). */
  bubble: Bubble;
  /** Always `effectiveKit(bubble, doc)`, resolved once by the shell's owner so
   *  no panel is tempted to read `ownKit` or `starterKit` directly. */
  kit: Kit;
  dispatch: Dispatch<Action>;
  t: (k: MessageKey) => string;
  lastError: StudioState["lastError"];

  tab: Tab;
  onTab: (tab: Tab) => void;

  mode: StageMode;
  selectedLoopId: string | null;
  selectedStepId: string | null;
  preview: MoodSample | null;
  head: HeadPose;
  zoom: number;
  trackCollapsed: boolean;
  clock: StageClock;

  onPlay: (loopId: string) => void;
  onPause: () => void;
  onStop: () => void;
  onSelectLoop: (loopId: string) => void;
  onSelectStep: (stepId: string | null) => void;
  onScrub: (ms: number) => void;
  onPreview: (sample: MoodSample | null) => void;
  onHead: (head: HeadPose) => void;
  onZoom: (zoom: number) => void;
  onToggleTrackCollapsed: () => void;

  /**
   * The element inspector overlays portal into (docs/05 §2). It is the
   * inspector column on desktop and the sheet on phone — whichever it is, it
   * must be the *positioned* box the panel scrolls inside, or the mood editor
   * is clipped by that scroll box instead of covering it.
   */
  overlayHost: HTMLElement | null;
  onOverlayHost: (el: HTMLElement | null) => void;
  /** The stage column, which the Share panel draws its export frame over. */
  stageHost: HTMLElement | null;
  onStageHost: (el: HTMLElement | null) => void;
}
