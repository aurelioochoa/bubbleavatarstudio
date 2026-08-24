// docs/05 §3 a11y contrast, encoded as a fixture rather than an assertion in
// prose: "Color contrast >= 4.5:1 for text". The ratios are computed from the
// real token values parsed out of styles.css, so a palette edit that breaks
// the rule fails here instead of shipping.
//
// WCAG 2.1 relative luminance + contrast ratio (1.4.3 for text, 1.4.11 for
// non-text UI components).
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// Resolved from the vitest root rather than import.meta.url: these app tests
// run in jsdom, where import.meta.url is not a file: URL.
const CSS = readFileSync(resolve(process.cwd(), "src/app/styles.css"), "utf8");

/** Every `--color-x: #hex` declared in the @theme block. */
function tokens(): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /--color-([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\s*;/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(CSS)) !== null) {
    const [, name, hex] = m;
    if (name && hex) out[name] = hex.toLowerCase();
  }
  return out;
}

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function luminance(hex: string): number {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

const T = tokens();
const WHITE = "#ffffff";

/** Reads a token, failing loudly if the palette dropped it. */
function tok(name: string): string {
  const v = T[name];
  if (!v) throw new Error(`--color-${name} missing from styles.css`);
  return v;
}

describe("theme tokens", () => {
  it("declares the palette docs/05 §4 specifies", () => {
    for (const name of [
      "stage",
      "panel",
      "panel-2",
      "primary",
      "primary-hi",
      "brand",
      "accent",
      "ink",
      "ink-dim",
      "danger",
    ]) {
      expect(tok(name)).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});

describe("contrast: text (docs/05 §3, >= 4.5:1)", () => {
  // Filled controls carrying white text at 12px: active tab, primary buttons,
  // selected chips and mood cards. Both the resting and hover fills count.
  it.each([
    ["white on primary", WHITE, "primary"],
    ["white on primary-hi (hover)", WHITE, "primary-hi"],
  ])("%s", (_label, fg, bgToken) => {
    expect(contrast(fg, tok(bgToken))).toBeGreaterThanOrEqual(4.5);
  });

  it.each([
    ["ink on stage", "ink", "stage"],
    ["ink on panel", "ink", "panel"],
    ["ink on panel-2", "ink", "panel-2"],
    ["ink-dim on panel", "ink-dim", "panel"],
    ["ink-dim on panel-2", "ink-dim", "panel-2"],
    ["danger on panel-2", "danger", "panel-2"],
  ])("%s", (_label, fgToken, bgToken) => {
    expect(contrast(tok(fgToken), tok(bgToken))).toBeGreaterThanOrEqual(4.5);
  });
});

describe("contrast: non-text UI (WCAG 1.4.11, >= 3:1)", () => {
  // The vivid brand indigo is reserved for marks that carry no text — the
  // active rail ring, the slider thumb, the status dot — so it is held to the
  // component threshold rather than the text one.
  it.each([
    ["brand ring on panel", "brand", "panel"],
    ["brand thumb on slider track", "brand", "panel-3"],
    ["accent focus ring on stage", "accent", "stage"],
  ])("%s", (_label, fgToken, bgToken) => {
    expect(contrast(tok(fgToken), tok(bgToken))).toBeGreaterThanOrEqual(3);
  });
});
