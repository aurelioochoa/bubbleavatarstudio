// The tablet studio (FR-12.1): 768–1023px, where the rail and a full stage fit
// but a 360px inspector standing beside them does not.
//
// The inspector is a drawer, but one that *pushes* rather than covers. Drawn
// over the stage it hid half the character — the character is centred in its
// column, so an overlay taking the right half takes the right half of the face,
// and FR-4.4 wants the thing being judged in full. Pushed, the columns share
// the width and the character is redrawn smaller but whole: at 768 the stage
// still gets 336px, which is a 316px character, not a thumbnail.
//
// It stays a drawer rather than a fixed column because at this width the full
// stage is worth being able to ask for.
//
// The track keeps its band here — there is width for the strip at this size,
// which is the thing the phone could not give it — but starts folded, because
// the drawer is the more likely first move and the two together would leave
// little else.
import { useState } from "react";
import { Stage } from "../../stage/Stage";
import { BubbleRail } from "../BubbleRail";
import { Track } from "../Track";
import { InspectorBody, InspectorTabs } from "./InspectorPanels";
import type { ShellProps } from "./props";

export function TabletShell(props: ShellProps) {
  const {
    doc,
    bubble,
    kit,
    dispatch,
    t,
    mode,
    selectedLoopId,
    selectedStepId,
    preview,
    head,
    zoom,
    trackCollapsed,
    clock,
    tab,
    onPlay,
    onPause,
    onStop,
    onSelectLoop,
    onSelectStep,
    onScrub,
    onHead,
    onZoom,
    onToggleTrackCollapsed,
    onOverlayHost,
    onStageHost,
  } = props;

  /** Layout state, like the phone's detent: it says nothing about the
   *  character, so it stays out of the document and out of `ShellProps`. */
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex min-h-0 flex-1">
        <BubbleRail
          bubbles={doc.bubbles}
          activeId={bubble.id}
          dispatch={dispatch}
          t={t}
        />

        <main
          ref={onStageHost}
          className="relative min-w-0 flex-1 overflow-hidden"
          style={{ "--stage-zoom": String(zoom) } as React.CSSProperties}
        >
          <Stage
            bubble={bubble}
            kit={kit}
            loopId={selectedLoopId}
            mode={mode}
            preview={preview}
            t={t}
            clock={clock}
            head={head}
            onHead={onHead}
            zoom={zoom}
            onZoom={onZoom}
            onPause={onPause}
          />

          {/* Bottom-left, where no stage overlay sits: the status pill is top
              left, the zoom pill bottom right, and the axes triad is off
              unless asked for. A sibling of the engine's host, never a child
              (FR-11.2). */}
          <button
            type="button"
            aria-label={t("inspector.toggle")}
            aria-expanded={open}
            onClick={() => {
              setOpen((v) => !v);
            }}
            className="absolute bottom-4 left-4 z-20 flex h-11 items-center gap-2 rounded-full border border-line bg-panel/85 px-4 text-xs text-ink-dim backdrop-blur-md transition-colors duration-150 ease-out hover:text-ink"
          >
            {t("inspector.toggle")}
          </button>
        </main>

        {/* A column beside the stage, exactly as on desktop, so the mood
            editor's modal is scoped to it and the character is judged beside
            it rather than under it (docs/05 §2). */}
        {open && (
          <aside
            ref={onOverlayHost}
            className="relative flex w-90 max-w-[45%] shrink-0 flex-col border-l border-line bg-panel"
          >
            <InspectorTabs {...props} />
            <InspectorBody {...props} />
          </aside>
        )}
      </div>

      <Track
        bubble={bubble}
        kit={kit}
        loopId={selectedLoopId}
        mode={mode}
        clock={clock}
        dispatch={dispatch}
        t={t}
        collapsed={trackCollapsed}
        tray={tab === "moods"}
        selectedStepId={selectedStepId}
        onToggleCollapsed={onToggleTrackCollapsed}
        onSelectStep={onSelectStep}
        onScrub={onScrub}
        onPlay={onPlay}
        onPause={onPause}
        onStop={onStop}
        onSelectLoop={onSelectLoop}
      />
    </>
  );
}
