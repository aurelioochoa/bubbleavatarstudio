// Share panel: snapshots + portable export + project backup (FR-10).
//
// The snapshot card previews exactly what it will download — same scene, same
// background, only a smaller box — so the background pickers are judged by
// eye rather than by imagination.
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

      <Card title={t("share.runtime")}>
        <div
          role="group"
          aria-label={t("share.loops")}
          className="space-y-1 rounded-field bg-panel p-2"
        >
          <p className="text-[10px] tracking-wide text-ink-dim uppercase">
            {t("share.loops")}
          </p>
          {kit.loops.map((l) => (
            <label
              key={l.id}
              className="flex items-center gap-2 text-xs text-ink"
            >
              <input
                type="checkbox"
                checked={!excluded.includes(l.id)}
                onChange={(e) => {
                  setExcluded((cur) =>
                    e.target.checked
                      ? cur.filter((id) => id !== l.id)
                      : [...cur, l.id],
                  );
                }}
              />
              <span className="min-w-0 truncate">{l.name}</span>
            </label>
          ))}
        </div>
        <button
          type="button"
          onClick={exportAvatar}
          className="w-full rounded-field bg-primary px-2 py-2 text-xs text-white transition-colors duration-150 ease-out hover:bg-primary-hi"
        >
          .bubble-avatar.json
        </button>
        <button type="button" onClick={exportZip} className={BTN}>
          ZIP
        </button>
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
