// Share panel: snapshots + portable export + project backup (FR-10).
import { useState } from "react";
import type {
  Bubble,
  Kit,
  StudioDocument,
} from "../../../domain/document/types";
import {
  buildPortableAvatar,
  download,
  snapshotPng,
  snapshotSvg,
} from "../../../export/avatar";
import { createZip, textEntry } from "../../../export/zip";
import { validateDocument } from "../../../domain/document/validate";
import type { MessageKey } from "../../i18n";
import { Card, Segmented } from "../ui";

export interface SharePanelProps {
  bubble: Bubble;
  kit: Kit;
  doc: StudioDocument;
  dispatch: React.Dispatch<{ type: "load"; doc: StudioDocument }>;
  t: (k: MessageKey) => string;
}

const SIZES = [512, 1024, 2048] as const;

export function SharePanel({ bubble, doc, dispatch, t }: SharePanelProps) {
  const [size, setSize] = useState<(typeof SIZES)[number]>(1024);
  const [bg, setBg] = useState<"transparent" | "solid" | "gradient">(
    "transparent",
  );
  const [importError, setImportError] = useState(false);

  const background =
    bg === "solid"
      ? { type: "solid" as const, color: "#0b0d16" }
      : bg === "gradient"
        ? { type: "linear" as const, from: "#1a1d2e", to: "#0b0d16" }
        : null;

  const exportAvatar = () => {
    const avatar = buildPortableAvatar(bubble, doc);
    const doc2 = { ...doc, bubbles: [avatar.bubble], starterKit: avatar.kit };
    // Validate a projected document to guarantee referential integrity pre-download.
    const projected: typeof doc2 & {
      version: 1;
      kind: "bubble-studio-project";
    } = doc2;
    if (!validateDocument(projected).ok) return;
    download(
      `${bubble.name.toLowerCase().replace(/\s+/g, "-")}.bubble-avatar.json`,
      JSON.stringify(avatar, null, 2),
    );
  };

  const exportZip = () => {
    const avatar = buildPortableAvatar(bubble, doc);
    const zip = createZip([
      textEntry("bubble.bubble-avatar.json", JSON.stringify(avatar, null, 2)),
      textEntry("bubble.svg", snapshotSvg(bubble, { size: 1024, background })),
      textEntry(
        "README.txt",
        "Bubble Avatar package\nbubble.bubble-avatar.json — portable definition (runtime)\nbubble.svg — 1024px snapshot\n",
      ),
    ]);
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
        // FR-9: import parses, validates, then replaces only after confirmation.
        if (
          globalThis.confirm(
            "¿Reemplazar el proyecto actual? / Replace current project?",
          )
        ) {
          dispatch({ type: "load", doc: parsed as StudioDocument });
        }
      } catch {
        setImportError(true);
      }
    });
  };

  const BTN =
    "w-full rounded-field bg-panel px-2 py-2 text-xs text-ink transition-colors duration-150 ease-out hover:bg-panel-3";

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
          ]}
          onChange={setBg}
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
    </div>
  );
}
