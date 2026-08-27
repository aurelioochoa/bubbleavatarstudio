// The three-column studio (docs/05 §1, FR-12.1 desktop): rail, stage and
// inspector side by side, with the track crossing all three below.
//
// This is the shell the studio shipped with and the one every screenshot in
// docs/screenshots/ archives; it is unchanged by the responsive work beyond
// being lifted out of `StudioView` so the other two could exist beside it.
import { Stage } from "../../stage/Stage";
import { BubbleRail } from "../BubbleRail";
import { Track } from "../Track";
import { InspectorBody, InspectorTabs } from "./InspectorPanels";
import type { ShellProps } from "./props";

export function DesktopShell(props: ShellProps) {
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

  return (
    <>
      <div className="flex min-h-0 flex-1">
        <BubbleRail
          bubbles={doc.bubbles}
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
          ref={onStageHost}
          className="stage-box relative min-w-0 flex-1 overflow-hidden"
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
        </main>

        {/* `relative`: the mood editor is a modal scoped to this column, so
            the stage stays visible behind it (docs/05 §2). */}
        <aside
          ref={onOverlayHost}
          className="relative flex w-90 shrink-0 flex-col border-l border-line bg-panel"
        >
          <InspectorTabs {...props} />
          <InspectorBody {...props} />
        </aside>
      </div>

      {/* FR-6.6: below all three columns, not floating over one of them. */}
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
