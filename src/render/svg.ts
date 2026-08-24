// Scene → deterministic SVG string (docs/04). Byte-stable: fixed attribute
// order, 2-decimal numbers, no whitespace variance. Shared by stage,
// snapshots and the SSR-safe runtime.
import type { Scene } from "./scene";
import { fmt } from "../domain/geometry/primitives";

function eyeElement(id: string, eye: Scene["eyes"]["left"]): string {
  const w = Math.max(eye.width, 0);
  const h = Math.max(eye.height, 0);
  const rx = fmt(Math.min(w, h) / 2);
  return [
    `<g id="${id}" transform="translate(${fmt(eye.x)} ${fmt(eye.y)}) rotate(${fmt(eye.rotationDeg)})">`,
    `<rect x="${fmt(-w / 2)}" y="${fmt(-h / 2)}" width="${fmt(w)}" height="${fmt(h)}" rx="${rx}" fill="${eye.fill}"/>`,
    "</g>",
  ].join("");
}

export interface SvgOptions {
  /**
   * Rendered box in px (square). The viewBox always stays the scene's own
   * coordinate space, so this scales the drawing rather than cropping it.
   * Defaults to the scene size, which keeps the goldens byte-identical.
   */
  size?: number;
  /** null ⇒ transparent. */
  background:
    | null
    | { type: "solid"; color: string }
    | { type: "linear"; from: string; to: string }
    | { type: "radial"; from: string; to: string };
}

export function sceneToSvg(
  scene: Scene,
  opts: SvgOptions = { background: null },
): string {
  const bg: string[] = [];
  if (opts.background) {
    const b = opts.background;
    if (b.type === "solid") {
      bg.push(
        `<rect width="${fmt(scene.size)}" height="${fmt(scene.size)}" fill="${b.color}"/>`,
      );
    } else {
      const gid = "bg-gradient";
      const attrs =
        b.type === "linear"
          ? 'x1="0" y1="0" x2="1" y2="1"'
          : 'cx="0.5" cy="0.5" r="0.7"';
      bg.push(
        `<defs><${b.type === "linear" ? "linearGradient" : "radialGradient"} id="${gid}" ${attrs}>`,
        `<stop offset="0" stop-color="${b.from}"/><stop offset="1" stop-color="${b.to}"/>`,
        `</${b.type === "linear" ? "linearGradient" : "radialGradient"}></defs>`,
        `<rect width="${fmt(scene.size)}" height="${fmt(scene.size)}" fill="url(#${gid})"/>`,
      );
    }
  }

  const box = fmt(opts.size ?? scene.size);
  const center = fmt(scene.size / 2);
  const extras = scene.extras
    .map(
      (e) =>
        `<path d="${e.path}" fill="${e.fill}" transform="${e.transform}"/>`,
    )
    .join("");
  const eyes =
    eyeElement("eye-left", scene.eyes.left) +
    eyeElement("eye-right", scene.eyes.right);

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${fmt(scene.size)} ${fmt(scene.size)}" width="${box}" height="${box}">` +
    bg.join("") +
    `<g id="bubble" transform="translate(${center} ${center})">` +
    `<path id="body" d="${scene.body.path}" fill="${scene.body.fill}" transform="${scene.body.transform}"/>` +
    extras +
    eyes +
    "</g></svg>"
  );
}
