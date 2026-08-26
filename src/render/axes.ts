// FR-8.7: the orientation triad as a standalone SVG document.
//
// Its own document rather than chrome inside the character's scene, because it
// is a corner widget: a reading of the pose that stays legible and never
// crosses the silhouette it describes. That also keeps `Scene` and all three
// goldens untouched by it.
//
// No colour of its own. The guide takes `currentColor` for the same reason,
// but three axes need three colours and one inherited colour cannot serve
// them, so the caller passes all four in from the studio's tokens — the pure
// layer still never learns a palette value.
import { axisTriad } from "../domain/geometry/axes";
import { fmt } from "../domain/geometry/primitives";

export interface TriadColors {
  x: string;
  y: string;
  z: string;
  origin: string;
}

export interface TriadOptions {
  colors: TriadColors;
  /** Rendered box in px. The viewBox is fixed, so this only scales it. */
  size?: number;
}

const BOX = 64;
const CENTRE = BOX / 2;
/** Leaves room for the label at the tip without it clipping the box. */
const RADIUS = 21;
/** How faint an axis pointing straight away is drawn. */
const FADE_MIN = 0.32;

export function triadSvg(
  rotation: { x: number; y: number; z: number },
  { colors, size = BOX }: TriadOptions,
): string {
  const axes = axisTriad(rotation, RADIUS);
  const body = axes
    .map((axis) => {
      const x = CENTRE + axis.tip.x;
      const y = CENTRE + axis.tip.y;
      const color = colors[axis.name];
      // Only the rear hemisphere fades, and it fades smoothly.
      //
      // A threshold would pop — one degree past edge-on looks identical to one
      // degree before it, so they must not render differently. But ramping
      // across the whole range is wrong the other way: an axis at depth 0 is
      // edge-on to the viewer and therefore at its *longest* on screen, fully
      // legible, and has no business being drawn at half strength. So the
      // front half stays solid and the back half falls away to `FADE_MIN`,
      // which is continuous at the horizon because both sides meet at 1.
      const opacity = axis.depth >= 0 ? 1 : 1 + axis.depth * (1 - FADE_MIN);
      const dim = opacity >= 1 ? "" : ` opacity="${fmt(opacity)}"`;
      return (
        `<g${dim}>` +
        `<line x1="${fmt(CENTRE)}" y1="${fmt(CENTRE)}" x2="${fmt(x)}" y2="${fmt(y)}" stroke="${color}" stroke-width="2" stroke-linecap="round"/>` +
        `<circle cx="${fmt(x)}" cy="${fmt(y)}" r="6" fill="${color}"/>` +
        // The letter rides in the dot, so the axis is never named by colour
        // alone (docs/05 §3) and stays readable at any rotation.
        `<text x="${fmt(x)}" y="${fmt(y)}" fill="${colors.origin}" font-size="7.5" font-family="ui-sans-serif, system-ui, sans-serif" font-weight="600" text-anchor="middle" dominant-baseline="central">${axis.name.toUpperCase()}</text>` +
        `</g>`
      );
    })
    .join("");
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${String(BOX)} ${String(BOX)}" width="${String(size)}" height="${String(size)}">` +
    `<circle cx="${fmt(CENTRE)}" cy="${fmt(CENTRE)}" r="2.2" fill="${colors.origin}"/>` +
    body +
    `</svg>`
  );
}
