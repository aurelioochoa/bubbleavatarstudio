// The phone studio (FR-12.1, FR-12.2, FR-12.3): the rail across the top, the
// stage taking what is left, and the inspector as a bottom sheet.
//
// The sheet is a flex item with a percentage height rather than something
// floating over the stage, which is what makes FR-12.3 structural instead of a
// promise: whatever height the sheet is at, the stage gets the rest, and it
// cannot be covered because the two are siblings dividing one column.
import { useState } from "react";
import { Stage } from "../../stage/Stage";
import { BubbleRail } from "../BubbleRail";
import { InspectorBody, InspectorTabs } from "./InspectorPanels";
import { PhoneTransport } from "./PhoneTransport";
import { Sheet, type Detent } from "./Sheet";
import type { ShellProps } from "./props";

export function PhoneShell(props: ShellProps) {
  const {
    doc,
    bubble,
    kit,
    dispatch,
    t,
    mode,
    selectedLoopId,
    preview,
    head,
    zoom,
    clock,
    onPlay,
    onPause,
    onStop,
    onHead,
    onZoom,
    onOverlayHost,
    onStageHost,
  } = props;

  /**
   * How far up the sheet is. Layout state, not studio state: it says nothing
   * about the character, so it never reaches the document or `ShellProps`.
   * It rests at `half`, which leaves the stage the 40% FR-12.2 asks for.
   */
  const [detent, setDetent] = useState<Detent>("half");

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <BubbleRail
        bubbles={doc.bubbles}
        activeId={bubble.id}
        dispatch={dispatch}
        t={t}
        orientation="horizontal"
      />

      {/* Same contract as the desktop column: positioned, so the Share panel's
          export frame can be drawn over the stage as a sibling of the engine's
          host, and carrying the zoom as a custom property (FR-10.6). */}
      <main
        ref={onStageHost}
        className="relative min-h-0 min-w-0 flex-1 overflow-hidden"
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

      <Sheet
        detent={detent}
        onDetent={setDetent}
        label={t("sheet.label")}
        gripLabel={t("sheet.grip")}
        onHost={onOverlayHost}
      >
        {/* Above the tabs, so the transport is reachable from every one of
            them — and inside the sheet rather than over the stage, because an
            overlay covers the character exactly when the sheet is tall and the
            stage is short, which is when FR-12.3 matters most. */}
        <PhoneTransport
          kit={kit}
          loopId={selectedLoopId}
          mode={mode}
          t={t}
          onPlay={onPlay}
          onPause={onPause}
          onStop={onStop}
        />
        <InspectorTabs {...props} />
        <InspectorBody {...props} />
      </Sheet>
    </div>
  );
}
