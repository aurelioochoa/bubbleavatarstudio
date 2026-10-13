// Scene → deterministic SVG string (docs/04). Byte-stable: fixed attribute
// order, 2-decimal numbers, no whitespace variance. Shared by stage,
// snapshots and the SSR-safe runtime.
import type { Scene, Shading } from "./scene";
import { fmt } from "../domain/geometry/primitives";

function shadingDefinition(shading: Shading): string {
  return (
    `<defs><radialGradient id="${shading.id}" cx="${fmt(shading.cx)}" cy="${fmt(shading.cy)}" r="${fmt(shading.radius)}">` +
    `<stop offset="0" stop-color="${shading.crown}"/>` +
    `<stop offset="0.55" stop-color="${shading.base}"/>` +
    `<stop offset="0.93" stop-color="${shading.edge}"/>` +
    `<stop offset="1" stop-color="${shading.rim}"/>` +
    `</radialGradient></defs>`
  );
}

function eyeElement(id: string, eye: Scene["eyes"]["left"]): string {
  const w = Math.max(eye.width, 0);
  const h = Math.max(eye.height, 0);
  // Half the shorter side is a full capsule; roundness scales in from there.
  const rx = fmt((Math.min(w, h) / 2) * eye.roundness);
  // Omitted at full opacity so a face-on render keeps its minimal markup.
  const opacity =
    eye.opacity >= 1 ? "" : ` opacity="${fmt(Math.max(eye.opacity, 0))}"`;
  return [
    `<g id="${id}" transform="translate(${fmt(eye.x)} ${fmt(eye.y)}) rotate(${fmt(eye.rotationDeg)})"${opacity}>`,
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
  const shading = scene.body.shading;
  // objectBoundingBox units: the gradient tracks the silhouette whatever its
  // size, so one definition works for every character.
  const shadeDefs = shading ? shadingDefinition(shading) : "";
  const bodyFill = shading ? `url(#${shading.id})` : scene.body.fill;
  const extras = scene.extras
    .map((e) => {
      // Omitted at full opacity, the same rule the eyes follow, so a face-on
      // render keeps its minimal markup.
      const opacity =
        e.opacity >= 1 ? "" : ` opacity="${fmt(Math.max(e.opacity, 0))}"`;
      const definition = e.shading ? shadingDefinition(e.shading) : "";
      const fill = e.shading ? `url(#${e.shading.id})` : e.fill;
      return (
        definition +
        `<path d="${e.path}" fill="${fill}" transform="${e.transform}"${opacity}/>`
      );
    })
    .join("");
  // The face is cut off by the body rather than faded out at the limb, which
  // is what makes an eye that has travelled round the side read as being on a
  // solid. Extras are deliberately outside this: they are volumes assembled
  // around the body, not marks on its surface, and they are meant to overhang.
  const fc = scene.faceClip;
  const clipDefs = fc
    ? `<defs><clipPath id="${fc.id}">` +
      `<path d="${fc.path}" transform="${fc.transform}"/>` +
      `</clipPath></defs>`
    : "";
  const face =
    eyeElement("eye-left", scene.eyes.left) +
    eyeElement("eye-right", scene.eyes.right);
  const eyes = fc ? `<g clip-path="url(#${fc.id})">${face}</g>` : face;
  // FR-8.4: stage chrome rather than character, so it takes its colour from
  // whatever the host sets — the accent token stays in styles.css.
  const g = scene.guide;
  const guideClipId = g ? `guide-${shading?.id ?? "body"}` : "";
  // Non-scaling strokes stay readable when the stage is zoomed or narrowed.
  const guidePath = (d: string) =>
    `<path d="${d}" vector-effect="non-scaling-stroke"/>`;
  const guide = g
    ? `<defs><clipPath id="${guideClipId}"><path d="${g.outline.path}" transform="${g.outline.transform}"/></clipPath></defs>` +
      `<g id="guide" aria-hidden="true" pointer-events="none" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">` +
      `<g clip-path="url(#${guideClipId})">` +
      `<g transform="${g.transform}">` +
      `<g data-guide="back" stroke-width="0.8" stroke-dasharray="3 4" opacity="0.24">` +
      g.backArcs.map(guidePath).join("") +
      `</g><g data-guide="front" stroke-width="1" opacity="0.6">` +
      g.arcs.map(guidePath).join("") +
      `</g></g></g>` +
      `<path data-guide="outline" d="${g.outline.path}" transform="${g.outline.transform}" stroke-width="1.1" opacity="0.7" vector-effect="non-scaling-stroke"/>` +
      "</g>"
    : "";

  // Outside the head group on purpose: a shadow that inherits the roll and the
  // bob is not a shadow. The gradient is character-independent, so one fixed
  // id serves every avatar on a page — the same rule `bg-gradient` follows.
  const sh = scene.shadow;
  const shadow = sh
    ? `<defs><radialGradient id="shadow-fade" cx="0.5" cy="0.5" r="0.5">` +
      `<stop offset="0" stop-color="#000000" stop-opacity="1"/>` +
      `<stop offset="1" stop-color="#000000" stop-opacity="0"/>` +
      `</radialGradient></defs>` +
      `<ellipse cx="${fmt(sh.cx)}" cy="${fmt(sh.cy)}" rx="${fmt(Math.max(sh.rx, 0))}" ry="${fmt(Math.max(sh.ry, 0))}" fill="url(#shadow-fade)" opacity="${fmt(Math.max(sh.opacity, 0))}"/>`
    : "";

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${fmt(scene.size)} ${fmt(scene.size)}" width="${box}" height="${box}">` +
    bg.join("") +
    `<g id="bubble" transform="translate(${center} ${center})">` +
    shadow +
    // The head group owns position and roll; body, extras and eyes are all
    // expressed in the face frame and inherit it.
    `<g id="head" transform="${scene.head.transform}">` +
    shadeDefs +
    `<path id="body" d="${scene.body.path}" fill="${bodyFill}" transform="${scene.body.transform}"/>` +
    clipDefs +
    guide +
    extras +
    eyes +
    "</g></g></svg>"
  );
}
