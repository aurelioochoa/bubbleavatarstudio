// The inspector's two halves, shared by all three shells (FR-12.1).
//
// Only where they sit differs — a column on desktop, a slide-over on tablet, a
// bottom sheet on phone — so the tab strip and the panel switch live here
// rather than three times over. Everything these do to the rest of the studio
// travels through `ShellProps`; neither holds state of its own.
import { LookPanel } from "../panels/LookPanel";
import { MoodsPanel } from "../panels/MoodsPanel";
import { LoopsPanel } from "../panels/LoopsPanel";
import { SharePanel } from "../panels/SharePanel";
import { PanelScroll } from "../ui";
import type { ShellProps, Tab } from "./props";

export function InspectorTabs({ tab, onTab, t }: ShellProps) {
  const tabs: { id: Tab; label: string }[] = [
    { id: "look", label: t("tab.look") },
    { id: "moods", label: t("tab.moods") },
    { id: "loops", label: t("tab.loops") },
    { id: "share", label: t("tab.share") },
  ];

  return (
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
            onTab(x.id);
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
  );
}

/** The error banner and whichever panel the tab names. */
export function InspectorBody(props: ShellProps) {
  const {
    bubble,
    kit,
    doc,
    dispatch,
    t,
    tab,
    lastError,
    overlayHost,
    stageHost,
    head,
    selectedLoopId,
    selectedStepId,
    onSelectLoop,
    onSelectStep,
    onPreview,
  } = props;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {lastError && (
        <p
          role="alert"
          className="m-3 mb-0 shrink-0 rounded-field border border-danger/30 bg-danger/15 px-2.5 py-1.5 text-xs text-danger"
        >
          {lastError.code === "E_REF" ? t("error.ref") : t("error.generic")}
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
          overlayHost={overlayHost}
          onPreview={onPreview}
        />
      )}
      {tab === "loops" && (
        <LoopsPanel
          kit={kit}
          dispatch={dispatch}
          t={t}
          selectedLoopId={selectedLoopId}
          onSelectLoop={onSelectLoop}
          selectedStepId={selectedStepId}
          onSelectStep={onSelectStep}
        />
      )}
      {tab === "share" && (
        <PanelScroll>
          <SharePanel
            bubble={bubble}
            kit={kit}
            doc={doc}
            dispatch={dispatch}
            overlayHost={overlayHost}
            stageHost={stageHost}
            head={head}
            t={t}
          />
        </PanelScroll>
      )}
    </div>
  );
}
