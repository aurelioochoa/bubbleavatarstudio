// BubbleAvatar React runtime (FR-10, docs/06). SSR-safe: renders the resting
// SVG on the server; starts the rAF loop only after mount.
import { useEffect, useRef, useState } from "react";
import { restingScene, liveFrame } from "../render/scene";
import { sceneToSvg } from "../render/svg";
import type { PortableAvatar } from "../export/avatar";
import type { Kit } from "../domain/document/types";

export interface BubbleAvatarProps {
  definition: PortableAvatar;
  /** Loop id to play; defaults to the first loop. */
  loop?: string | null;
  autoplay?: boolean;
  paused?: boolean;
  size?: number;
  ariaLabel?: string;
}

export function BubbleAvatar({
  definition,
  loop,
  autoplay = true,
  paused = false,
  size = 128,
  ariaLabel,
}: BubbleAvatarProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !mounted) return;
    const kit: Kit = definition.kit;
    const first = kit.loops[0];
    const loopId = loop ?? (kit.loops.length > 0 ? first.id : null);
    if (!loopId || !autoplay || paused) {
      host.innerHTML = sceneToSvg(restingScene(definition.bubble, 0));
      return;
    }
    const start = performance.now();
    let raf = 0;
    const tick = () => {
      const { scene } = liveFrame(
        definition.bubble,
        kit,
        loopId,
        performance.now() - start,
        {
          x: 0,
          y: 0,
          z: 0,
        },
      );
      host.innerHTML = sceneToSvg(scene);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
    };
  }, [definition, loop, autoplay, paused, mounted]);

  const fallback = mounted
    ? ""
    : sceneToSvg(restingScene(definition.bubble, 0));

  return (
    <div
      ref={hostRef}
      role="img"
      aria-label={ariaLabel ?? definition.bubble.name}
      style={{ width: size, height: size }}
      // SSR: inline the resting SVG as initial content; hydrated by the loop.
      dangerouslySetInnerHTML={fallback ? { __html: fallback } : undefined}
    />
  );
}
