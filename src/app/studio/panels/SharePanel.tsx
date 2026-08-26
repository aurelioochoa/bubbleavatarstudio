// Share panel: snapshots + portable export + project backup (FR-10).
//
// The snapshot card previews exactly what it will download — same scene, same
// background, only a smaller box — so the background pickers are judged by
// eye rather than by imagination.
//
// FR-10.6 takes that one step further: the export frame is drawn on the stage,
// where the framing decision is actually made, and the panel says what the
// package will contain before it is built. Both numbers come from the same
// builder the download uses, so the panel cannot promise a file the button
// does not write.
import { useState } from "react";
import { createPortal } from "react-dom";
import type {
  Bubble,
  Kit,
  StudioDocument,
} from "../../../domain/document/types";
import {
  buildPortableAvatar,
  download,
  packageFiles,
  previewSvg,
  snapshotPng,
  snapshotSvg,
} from "../../../export/avatar";
import { createZip, textEntry } from "../../../export/zip";
import { validateDocument } from "../../../domain/document/validate";
import {
  summarizeDocument,
  type DocumentSummary,
} from "../../../domain/document/summary";
import { summarizeExport } from "../../../export/avatar";
import type { MessageKey } from "../../i18n";
import { Card, Modal, Segmented } from "../ui";

export interface SharePanelProps {
  bubble: Bubble;
  kit: Kit;
  doc: StudioDocument;
  dispatch: React.Dispatch<{ type: "load"; doc: StudioDocument }>;
  t: (k: MessageKey) => string;
  /** Where the import confirmation mounts; see MoodsPanel for why. */
  overlayHost?: HTMLElement | null;
  /**
   * Where the export frame is drawn (FR-10.6). It has to be a sibling of the
   * engine's host element, never a child, or the next frame's innerHTML write
   * erases it — the same rule every stage overlay follows (docs/05 §1).
   */
  stageHost?: HTMLElement | null;
}

const SIZES = [512, 1024, 2048] as const;
type BackgroundKind = "transparent" | "solid" | "gradient" | "radial";
const PREVIEW_PX = 132;

export function SharePanel({
  bubble,
  kit,
  doc,
  dispatch,
  t,
  overlayHost = null,
  stageHost = null,
}: SharePanelProps) {
  const [size, setSize] = useState<(typeof SIZES)[number]>(1024);
  const [bg, setBg] = useState<BackgroundKind>("transparent");
  const [from, setFrom] = useState("#1a1d2e");
  const [to, setTo] = useState("#0b0d16");
  const [importError, setImportError] = useState(false);
  /** A parsed, validated file waiting on the user's confirmation (FR-9.3). */
  const [pending, setPending] = useState<{
    doc: StudioDocument;
    summary: DocumentSummary;
  } | null>(null);
  // FR-10.3: every loop travels unless the user says otherwise, so the state
  // records the exclusions — a kit that gains a loop keeps the default.
  const [excluded, setExcluded] = useState<string[]>([]);

  const loopIds = kit.loops
    .filter((l) => !excluded.includes(l.id))
    .map((l) => l.id);

  const background =
    bg === "solid"
      ? { type: "solid" as const, color: from }
      : bg === "gradient"
        ? { type: "linear" as const, from, to }
        : bg === "radial"
          ? { type: "radial" as const, from, to }
          : null;

  const BG_LABELS: Record<BackgroundKind, MessageKey> = {
    transparent: "share.bgTransparent",
    solid: "share.bgSolid",
    gradient: "share.bgGradient",
    radial: "share.bgRadial",
  };

  /** FR-10.6: counted off the avatar the download would actually build. */
  const weight = summarizeExport(bubble, doc, loopIds);

  const exportAvatar = () => {
    const avatar = buildPortableAvatar(bubble, doc, loopIds);
    // Validate a projected document to guarantee referential integrity
    // pre-download. Typed as the document itself so a schema bump reaches here.
    const projected: StudioDocument = {
      ...doc,
      bubbles: [avatar.bubble],
      starterKit: avatar.kit,
    };
    if (!validateDocument(projected).ok) return;
    download(
      `${bubble.name.toLowerCase().replace(/\s+/g, "-")}.bubble-avatar.json`,
      JSON.stringify(avatar, null, 2),
    );
  };

  const exportZip = () => {
    const zip = createZip(
      packageFiles(bubble, doc, loopIds).map((f) => textEntry(f.name, f.text)),
    );
    download("bubble-avatar.zip", zip);
  };

  const exportProject = () => {
    download("project.bubble-studio.json", JSON.stringify(doc, null, 2));
  };

  const importProject = (file: File) => {
    setImportError(false);
    void file.text().then((text) => {
      try {
        const parsed: unknown = JSON.parse(text);
        if (!validateDocument(parsed).ok) {
          // FR-9.3: invalid files are rejected with a readable error.
          setImportError(true);
          return;
        }
        const incoming = parsed as StudioDocument;
        // FR-9.3: parse, validate, describe — and only then offer to replace.
        setPending({ doc: incoming, summary: summarizeDocument(incoming) });
      } catch {
        setImportError(true);
      }
    });
  };

  const BTN =
    "w-full rounded-field bg-panel px-2 py-2 text-xs text-ink transition-colors duration-150 ease-out hover:bg-panel-3";

  const confirmDialog = pending && (
    <Modal
      title={t("share.importTitle")}
      closeLabel={t("common.close")}
      onClose={() => {
        setPending(null);
      }}
      footer={
        <>
          <button
            type="button"
            onClick={() => {
              dispatch({ type: "load", doc: pending.doc });
              setPending(null);
            }}
            className="rounded-field bg-primary px-3 py-1.5 text-xs text-white transition-colors duration-150 ease-out hover:bg-primary-hi"
          >
            {t("share.importReplace")}
          </button>
          <button
            type="button"
            onClick={() => {
              setPending(null);
            }}
            className="rounded-field bg-panel px-3 py-1.5 text-xs text-ink transition-colors duration-150 ease-out hover:bg-panel-3"
          >
            {t("common.cancel")}
          </button>
        </>
      }
    >
      <dl className="space-y-1 text-xs">
        <SummaryRow label={t("rail.bubbles")} value={pending.summary.bubbles} />
        <SummaryRow label={t("moods.title")} value={pending.summary.moods} />
        <SummaryRow label={t("loops.title")} value={pending.summary.loops} />
      </dl>
    </Modal>
  );

  return (
    <div className="space-y-3">
      {importError && (
        <p
          role="alert"
          className="rounded-field border border-danger/30 bg-danger/15 px-2.5 py-1.5 text-xs text-danger"
        >
          {t("error.import")}
        </p>
      )}

      <Card title={t("share.photo")}>
        <Segmented
          label={t("share.resolution")}
          value={String(size)}
          options={SIZES.map((s2) => ({
            value: String(s2),
            label: String(s2),
          }))}
          onChange={(v) => {
            setSize(Number(v) as (typeof SIZES)[number]);
          }}
        />
        <Segmented
          label={t("share.background")}
          value={bg}
          options={[
            { value: "transparent", label: t("share.bgTransparent") },
            { value: "solid", label: t("share.bgSolid") },
            { value: "gradient", label: t("share.bgGradient") },
            { value: "radial", label: t("share.bgRadial") },
          ]}
          onChange={setBg}
        />

        {bg !== "transparent" && (
          <div className="flex items-center gap-2 text-xs text-ink-dim">
            <ColorStop
              // A solid background has one colour, and it is the first stop —
              // reusing it keeps a switch between the three from resetting it.
              label={bg === "solid" ? t("share.solidColor") : t("share.bgFrom")}
              value={from}
              onChange={setFrom}
            />
            {bg !== "solid" && (
              <ColorStop label={t("share.bgTo")} value={to} onChange={setTo} />
            )}
          </div>
        )}

        <div
          data-testid="snapshot-preview"
          aria-label={t("share.preview")}
          role="img"
          className="mx-auto grid place-items-center rounded-field border border-line bg-[repeating-conic-gradient(var(--color-panel-3)_0_25%,transparent_0_50%)] bg-[length:12px_12px] p-1"
          dangerouslySetInnerHTML={{
            __html: previewSvg(bubble, { background, size: PREVIEW_PX }),
          }}
        />

        <div className="flex gap-2 pt-0.5">
          <button
            type="button"
            onClick={() => {
              download(
                `bubble.svg`,
                snapshotSvg(bubble, { size, background }),
                "image/svg+xml",
              );
            }}
            className={BTN}
          >
            SVG
          </button>
          <button
            type="button"
            onClick={() =>
              void snapshotPng(bubble, { size, background }).then((b2) => {
                download("bubble.png", b2);
              })
            }
            className={BTN}
          >
            PNG
          </button>
        </div>
      </Card>

      {/* FR-10.3 as chips rather than a column of twenty checkboxes: a group
          is chosen or cleared in one press, and the line underneath says what
          the choice costs. */}
      <Card
        title={t("share.loops")}
        state={
          <span className="rounded-full bg-panel px-1.5 py-0.5 tabular-nums">
            {loopIds.length}/{kit.loops.length}
          </span>
        }
      >
        <div role="group" aria-label={t("share.loops")} className="space-y-2.5">
          {byGroup(kit.loops).map((g) => {
            const ids = g.loops.map((l) => l.id);
            const anyOn = ids.some((id) => !excluded.includes(id));
            return (
              <div key={g.group} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-semibold tracking-[0.09em] text-ink-dim uppercase">
                    {groupLabel(g.group, t)}
                  </span>
                  <span
                    aria-hidden="true"
                    className="h-px flex-1 bg-line-soft"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setExcluded((cur) =>
                        anyOn
                          ? [...new Set([...cur, ...ids])]
                          : cur.filter((id) => !ids.includes(id)),
                      );
                    }}
                    className="text-[9.5px] text-accent transition-colors duration-150 ease-out hover:text-ink"
                  >
                    {anyOn ? t("share.none") : t("share.all")}
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {g.loops.map((l) => {
                    const on = !excluded.includes(l.id);
                    return (
                      <button
                        key={l.id}
                        type="button"
                        role="switch"
                        aria-checked={on}
                        onClick={() => {
                          setExcluded((cur) =>
                            on
                              ? [...cur, l.id]
                              : cur.filter((id) => id !== l.id),
                          );
                        }}
                        className={`flex items-center gap-1.5 rounded-full py-1 pr-2.5 text-[10.5px] transition-colors duration-150 ease-out ${
                          on
                            ? "bg-brand/20 pl-1.5 text-ink"
                            : "pr-2.5 pl-2.5 text-ink-mute shadow-[inset_0_0_0_1px_var(--color-line)]"
                        }`}
                      >
                        {on && <CheckIcon />}
                        <span className="max-w-24 truncate">{l.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div
          data-testid="export-weight"
          className="flex items-center gap-2 border-t border-line pt-2.5 text-[10px] tabular-nums text-ink-dim"
        >
          <span>
            {weight.loops} {t("loops.title").toLowerCase()}
          </span>
          <span aria-hidden="true" className="text-outline">
            ·
          </span>
          <span>
            {weight.moods} {t("moods.title").toLowerCase()}
          </span>
          <span aria-hidden="true" className="text-outline">
            ·
          </span>
          <span className="text-ink">
            {t("share.weight")} {Math.round(weight.bytes / 1024)} KB
          </span>
          {weight.prunedMoods > 0 && (
            <span className="ml-auto text-ink-mute">
              {weight.prunedMoods} {t("share.pruned")}
            </span>
          )}
        </div>
      </Card>

      <Card title={t("share.downloads")}>
        <DownloadRow
          title=".bubble-avatar.json"
          hint={t("share.definitionHint")}
          onClick={exportAvatar}
        >
          <FileIcon />
        </DownloadRow>
        <DownloadRow
          title={t("share.packageFile")}
          hint={t("share.packageHint")}
          onClick={exportZip}
        >
          <PackageIcon />
        </DownloadRow>
      </Card>

      <Card title={t("share.project")}>
        <button type="button" onClick={exportProject} className={BTN}>
          {t("share.exportProject")}
        </button>
        <label
          className={`block cursor-pointer border border-dashed border-line bg-transparent text-center ${BTN} hover:border-primary`}
        >
          {t("share.importProject")}
          <input
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importProject(f);
            }}
          />
        </label>
      </Card>

      {stageHost !== null &&
        createPortal(
          <ExportFrame
            label={`${String(size)} × ${String(size)} · ${t(BG_LABELS[bg])}`}
            note={t("share.notExported")}
            frameLabel={t("share.frame")}
          />,
          stageHost,
        )}

      {confirmDialog &&
        (overlayHost
          ? createPortal(confirmDialog, overlayHost)
          : confirmDialog)}
    </div>
  );
}

function ColorStop({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex min-w-0 flex-1 items-center gap-1.5">
      <input
        type="color"
        value={value}
        aria-label={label}
        onChange={(e) => {
          onChange(e.target.value);
        }}
        className="h-7 w-10 shrink-0 cursor-pointer rounded-field border border-line bg-panel"
      />
      <span className="min-w-0 truncate">{label}</span>
    </label>
  );
}

function SummaryRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-ink-dim">{label}</dt>
      <dd className="tabular-nums text-ink">{value}</dd>
    </div>
  );
}

/** Groups in first-appearance order — the catalogue's order, not the alphabet. */
function byGroup(
  loops: Kit["loops"],
): { group: string; loops: Kit["loops"] }[] {
  const out: { group: string; loops: Kit["loops"] }[] = [];
  for (const l of loops) {
    const bucket = out.find((g) => g.group === l.group);
    if (bucket) bucket.loops.push(l);
    else out.push({ group: l.group, loops: [l] });
  }
  return out;
}

function groupLabel(group: string, t: (k: MessageKey) => string): string {
  if (group === "life") return t("loops.groupLife");
  if (group === "reaction") return t("loops.groupReaction");
  return group;
}

/**
 * FR-10.6: the frame is drawn on the stage because that is where the framing
 * decision is made — the alternative is deciding a crop by reading a number in
 * a panel and imagining it over the character.
 *
 * It covers exactly the box the render occupies, which is what makes it true
 * rather than decorative: the scene's viewBox is square and the stage caps it
 * at the same `min(80%, 32rem)` this uses.
 */
function ExportFrame({
  label,
  note,
  frameLabel,
}: {
  label: string;
  note: string;
  frameLabel: string;
}) {
  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 grid place-items-center"
      >
        <div
          data-testid="export-frame"
          aria-label={frameLabel}
          className="relative h-[min(80%,32rem)] w-[min(80%,32rem)] border border-dashed border-accent/45"
        >
          {(
            [
              "-top-px -left-px",
              "-top-px -right-px",
              "-bottom-px -left-px",
              "-bottom-px -right-px",
            ] as const
          ).map((at) => (
            <span key={at} className={`absolute ${at}`}>
              <span className="absolute h-0.5 w-4.5 bg-accent" />
              <span className="absolute h-4.5 w-0.5 bg-accent" />
            </span>
          ))}
          <span className="absolute -top-6.5 left-0 rounded-[6px] bg-accent/14 px-2 py-0.5 text-[10px] tabular-nums text-accent">
            {label}
          </span>
        </div>
      </div>
      {/* Above the stage's own drag hint rather than on top of it: the hint
          retires after the first turn, but on a first visit both are true. */}
      <p className="pointer-events-none absolute bottom-10 left-1/2 -translate-x-1/2 text-[10.5px] text-ink-dim opacity-70">
        {note}
      </p>
    </>
  );
}

/** One downloadable artifact: what it is, and what is inside it. */
function DownloadRow({
  title,
  hint,
  onClick,
  children,
}: {
  title: string;
  hint: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-[10px] border border-line bg-stage px-2.5 py-2 text-left transition-colors duration-150 ease-out hover:border-outline"
    >
      <span className="shrink-0 text-accent">{children}</span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-xs font-medium text-ink">{title}</span>
        <span className="truncate text-[9.5px] text-ink-dim">{hint}</span>
      </span>
    </button>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 12 12" className="h-2 w-2 text-accent" aria-hidden="true">
      <path
        d="M2.4 6.4 4.8 8.8 9.6 3.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
      <path
        d="M9 1.6H4.6a1.6 1.6 0 0 0-1.6 1.6v9.6a1.6 1.6 0 0 0 1.6 1.6h6.8a1.6 1.6 0 0 0 1.6-1.6V5.6Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path
        d="M9 1.6V5.6h4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PackageIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
      <rect
        x="2.4"
        y="3.4"
        width="11.2"
        height="9.6"
        rx="1.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <path
        d="M6.6 3.4v3.2M9.4 3.4v3.2M6.6 8.4h2.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}
