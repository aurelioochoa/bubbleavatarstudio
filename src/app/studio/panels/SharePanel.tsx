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
import { validateDocument } from "../../../domain/document/validate";
import type { MessageKey } from "../../i18n";

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

  const exportProject = () => {
    download("project.bubble-studio.json", JSON.stringify(doc, null, 2));
  };

  const importProject = (file: File) => {
    void file.text().then((text) => {
      try {
        const parsed: unknown = JSON.parse(text);
        if (!validateDocument(parsed).ok) return;
        // FR-9: import parses, validates, then replaces only after confirmation.
        if (
          globalThis.confirm(
            "¿Reemplazar el proyecto actual? / Replace current project?",
          )
        ) {
          dispatch({ type: "load", doc: parsed as StudioDocument });
        }
      } catch {
        /* ignore malformed files */
      }
    });
  };

  return (
    <div className="space-y-4 text-xs">
      <section className="space-y-2">
        <h3 className="text-xs font-semibold tracking-wide text-[#9aa0c3] uppercase">
          Photo Mode
        </h3>
        <div className="flex gap-2">
          {SIZES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setSize(s);
              }}
              className={`rounded px-2 py-1 ${s === size ? "bg-[#6c7bff] text-white" : "bg-white/5"}`}
            >
              {String(s)}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {(["transparent", "solid", "gradient"] as const).map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => {
                setBg(b);
              }}
              className={`rounded px-2 py-1 ${b === bg ? "bg-[#6c7bff] text-white" : "bg-white/5"}`}
            >
              {b}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              download(
                `bubble.svg`,
                snapshotSvg(bubble, { size, background }),
                "image/svg+xml",
              );
            }}
            className="flex-1 rounded bg-white/5 px-2 py-1.5"
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
            className="flex-1 rounded bg-white/5 px-2 py-1.5"
          >
            PNG
          </button>
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-xs font-semibold tracking-wide text-[#9aa0c3] uppercase">
          Runtime
        </h3>
        <button
          type="button"
          onClick={exportAvatar}
          className="w-full rounded bg-[#6c7bff] px-2 py-1.5 text-white"
        >
          .bubble-avatar.json
        </button>
      </section>

      <section className="space-y-2">
        <h3 className="text-xs font-semibold tracking-wide text-[#9aa0c3] uppercase">
          Project
        </h3>
        <button
          type="button"
          onClick={exportProject}
          className="w-full rounded bg-white/5 px-2 py-1.5"
        >
          {t("tab.share")} · JSON
        </button>
        <label className="block w-full cursor-pointer rounded bg-white/5 px-2 py-1.5 text-center">
          Import
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
      </section>
    </div>
  );
}
