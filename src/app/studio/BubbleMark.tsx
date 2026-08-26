// The studio's mark, drawn by the studio's renderer (FR-9.8). The favicon in
// public/ is the same function at 64px, golden-tested against it, so the tab
// icon and the header logo are the same drawing by construction.
//
// `dangerouslySetInnerHTML` is the same call the stage makes: the string comes
// from our own pure serializer, never from a document or a user, and there is
// no other way to put an SVG document into the tree without re-parsing it.
import { useMemo } from "react";
import { markInkRatio, markSvg } from "../../render/mark";

export function BubbleMark({ size = 18 }: { size?: number }) {
  const svg = useMemo(() => markSvg(size), [size]);
  // The scene is square and the capsule is not, so the drawing is shorter than
  // the box that holds it. Occupying the whole box would make the header taller
  // by the transparent remainder — a row of stage paid for nothing anyone can
  // see — so the span claims only the inked height and lets the rest overflow.
  const ink = markInkRatio();
  return (
    <span
      aria-hidden="true"
      data-testid="bubble-mark"
      className="relative inline-block shrink-0"
      style={{ width: size * ink.x, height: size * ink.y }}
    >
      <span
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ width: size, height: size }}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </span>
  );
}
