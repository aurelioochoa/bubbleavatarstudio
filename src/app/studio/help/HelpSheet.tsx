// The help sheet the header opens: shortcuts (FR-9.7) and a guide to the
// studio (FR-9.9), as two tabs of one dialog.
//
// The dialog is given a size by the box around it rather than by its content.
// `Modal` is `absolute inset-0`, so without a sized positioned ancestor it
// spans the viewport — which is what left the old shortcut list stranded in a
// mostly empty sheet — and a fixed height is also what stops the dialog
// resizing under the pointer when the tabs are switched.
import { useId, useState } from "react";
import { Modal } from "../ui";
import { GUIDE_SECTIONS, SHORTCUT_GROUPS } from "./content";
import type { MessageKey } from "../../i18n";

type Pane = "shortcuts" | "guide";

export function HelpSheet({
  t,
  onClose,
}: {
  t: (k: MessageKey) => string;
  onClose: () => void;
}) {
  const [pane, setPane] = useState<Pane>("shortcuts");
  const base = useId();
  const tabId = (p: Pane) => `${base}-tab-${p}`;
  const panelId = `${base}-panel`;

  const tabs: { id: Pane; label: MessageKey }[] = [
    { id: "shortcuts", label: "help.tab.shortcuts" },
    { id: "guide", label: "help.tab.guide" },
  ];

  return (
    <div className="fixed inset-0 z-40 grid place-items-center p-6">
      <div className="relative h-[min(32rem,100%)] w-full max-w-3xl">
        <Modal
          title={t("help.title")}
          closeLabel={t("common.close")}
          onClose={onClose}
        >
          <div
            role="tablist"
            className="flex shrink-0 gap-0.5 rounded-field bg-panel p-0.5"
          >
            {tabs.map((x) => (
              <button
                key={x.id}
                id={tabId(x.id)}
                role="tab"
                type="button"
                aria-selected={pane === x.id}
                aria-controls={panelId}
                onClick={() => {
                  setPane(x.id);
                }}
                className={`flex-1 rounded-field px-2 py-1.5 text-xs transition-colors duration-150 ease-out ${
                  pane === x.id
                    ? "bg-primary text-white"
                    : "text-ink-dim hover:bg-white/6 hover:text-ink"
                }`}
              >
                {t(x.label)}
              </button>
            ))}
          </div>

          <div
            id={panelId}
            role="tabpanel"
            aria-labelledby={tabId(pane)}
            className="pt-1"
          >
            {pane === "shortcuts" ? (
              <ShortcutsPane t={t} />
            ) : (
              <GuidePane t={t} />
            )}
          </div>
        </Modal>
      </div>
    </div>
  );
}

/**
 * Two columns of groups, each a definition list: the gesture set as a key cap,
 * its effect beside it. One column of full sentences was mostly whitespace.
 *
 * Multi-column rather than a grid, because a grid row is as tall as its
 * tallest cell: the two-item group beside the four-item one was padded to
 * match it and left 66px of the blank this redesign exists to remove.
 * Columns flow instead, so a group takes the height it needs.
 */
function ShortcutsPane({ t }: { t: (k: MessageKey) => string }) {
  return (
    <div className="gap-x-6 sm:columns-2">
      {SHORTCUT_GROUPS.map((group) => (
        <section
          key={group.title}
          className="mb-4 space-y-1.5 break-inside-avoid"
        >
          <p className="text-[9px] font-semibold tracking-[0.09em] text-ink-dim uppercase">
            {t(group.title)}
          </p>
          <dl className="space-y-1">
            {group.items.map((item) => (
              <div
                key={item.gesture}
                className="flex items-baseline gap-2 rounded-field px-1.5 py-1 hover:bg-white/4"
              >
                <dt className="shrink-0 rounded-[4px] border border-line bg-panel px-1.5 py-0.5 font-mono text-[10px] whitespace-nowrap text-ink">
                  {t(item.gesture)}
                </dt>
                <dd className="min-w-0 text-xs text-ink-dim">
                  {t(item.effect)}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}

/**
 * The guide in two columns for the same reason. The sections are short and
 * independent, so a column break between them costs nothing, and a single
 * `max-w-prose` column left a third of a 744px sheet empty.
 */
function GuidePane({ t }: { t: (k: MessageKey) => string }) {
  return (
    <div className="gap-x-7 sm:columns-2">
      {GUIDE_SECTIONS.map((section) => (
        <section
          key={section.title}
          className="mb-3.5 space-y-1 break-inside-avoid"
        >
          <h3 className="text-xs font-semibold text-ink">{t(section.title)}</h3>
          <p className="text-xs leading-relaxed text-ink-dim">
            {t(section.body)}
          </p>
        </section>
      ))}
    </div>
  );
}
