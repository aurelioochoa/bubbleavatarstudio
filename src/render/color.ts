// Pure colour maths for shading. No DOM, no allocation surprises: every helper
// takes and returns a #rrggbb string so the SVG layer stays a pure function of
// the scene.

interface Rgb {
  r: number;
  g: number;
  b: number;
}

const clamp255 = (v: number): number =>
  Math.max(0, Math.min(255, Math.round(v)));

/** Parses #rgb or #rrggbb; anything unreadable falls back to mid grey. */
export function parseHex(hex: string): Rgb {
  const value = hex.trim().replace("#", "");
  const full =
    value.length === 3
      ? value
          .split("")
          .map((c) => c + c)
          .join("")
      : value;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return { r: 128, g: 128, b: 128 };
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

export function toHex({ r, g, b }: Rgb): string {
  const part = (v: number) => clamp255(v).toString(16).padStart(2, "0");
  return `#${part(r)}${part(g)}${part(b)}`;
}

/** Blends two colours, `t` 0 keeps `from`, 1 reaches `to`. */
export function mix(from: string, to: string, t: number): string {
  const a = parseHex(from);
  const b = parseHex(to);
  const k = Math.max(0, Math.min(1, t));
  return toHex({
    r: a.r + (b.r - a.r) * k,
    g: a.g + (b.g - a.g) * k,
    b: a.b + (b.b - a.b) * k,
  });
}

/** Toward white. */
export function lighten(hex: string, amount: number): string {
  return mix(hex, "#ffffff", amount);
}

/** Toward black. */
export function darken(hex: string, amount: number): string {
  return mix(hex, "#000000", amount);
}

/**
 * Perceived brightness, 0..1 (Rec. 601 luma). Used to keep shading readable on
 * both very dark and very light characters.
 */
export function luminance(hex: string): number {
  const { r, g, b } = parseHex(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}
