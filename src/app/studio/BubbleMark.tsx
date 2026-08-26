// The studio's mark, drawn by the studio's renderer (FR-9.8). The favicon in
// public/ is the same function at 64px, golden-tested against it, so the tab
// icon and the header logo are the same drawing by construction.
//
// `dangerouslySetInnerHTML` is the same call the stage makes: the string comes
// from our own pure serializer, never from a document or a user, and there is
// no other way to put an SVG document into the tree without re-parsing it.
import { useMemo } from "react";
import { markSvg } from "../../render/mark";

export function BubbleMark({ size = 18 }: { size?: number }) {
  const svg = useMemo(() => markSvg(size), [size]);
  return (
    <span
      aria-hidden="true"
      data-testid="bubble-mark"
      className="inline-flex shrink-0"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
