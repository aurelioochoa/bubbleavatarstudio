// FR-12.1: the one place the studio asks how wide the window is.
//
// Almost nothing should need this. An adaptation CSS can express belongs in
// CSS, where it costs no render and cannot disagree with itself; this is for
// the differences a class cannot make — the rail is a column in one shell and
// a strip in another, the inspector is an aside in one and a bottom sheet in
// another, and those are different trees rather than the same tree restyled.
//
// The widths are Tailwind's own `md:` and `lg:` (48rem / 64rem), stated here as
// the same literals so the CSS half of an adaptation and the JS half switch at
// exactly the same place. `rem` rather than `px` deliberately: a media query's
// `rem` is the browser's root size, so a reader who has enlarged their default
// font reaches the roomier layout sooner, which is the point of enlarging it.
import { useCallback, useSyncExternalStore } from "react";

const MD = "(min-width: 48rem)";
const LG = "(min-width: 64rem)";
const COARSE = "(pointer: coarse)";

export type Breakpoint = "phone" | "tablet" | "desktop";

/**
 * `matchMedia`, where there is one. The runtime renders on a server and the
 * studio has to boot inside embedders that predate it, so its absence is a
 * normal condition to answer rather than an error to throw. The cast is what
 * makes the check honest to the type checker, which otherwise believes the DOM
 * is always there.
 */
function mediaQuery(query: string): MediaQueryList | null {
  const mm = globalThis.matchMedia as typeof globalThis.matchMedia | undefined;
  return mm ? mm.call(globalThis, query) : null;
}

/**
 * Whether a media query matches, kept current as it changes.
 *
 * `useSyncExternalStore` rather than an effect that sets state: the query has
 * an answer during the very first render, and an effect would paint one frame
 * of the wrong shell before correcting itself — on a phone that frame is the
 * three-column desktop layout, and it is visible.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = mediaQuery(query);
      if (!list) return () => undefined;
      list.addEventListener("change", onChange);
      return () => {
        list.removeEventListener("change", onChange);
      };
    },
    [query],
  );
  const read = useCallback(() => mediaQuery(query)?.matches ?? false, [query]);
  // The third argument is the server snapshot; nothing is measurable there.
  return useSyncExternalStore(subscribe, read, () => false);
}

/**
 * Which of the three shells this window gets (FR-12.1).
 *
 * Where nothing can be measured the answer is desktop: it is the shell the
 * studio shipped with, and it fails in the gentler direction — a phone showing
 * three columns is cramped, where a desktop showing a bottom sheet is wrong.
 */
export function useBreakpoint(): Breakpoint {
  const wide = useMediaQuery(MD);
  const wider = useMediaQuery(LG);
  if (!mediaQuery(MD)) return "desktop";
  if (wider) return "desktop";
  if (wide) return "tablet";
  return "phone";
}

/**
 * Whether the primary pointer is a finger (FR-12.5).
 *
 * Asked separately from the width, and never inferred from it: a touchscreen
 * laptop is coarse at 1440px, and a phone in a desktop-mode browser is not the
 * other way round. Width decides the layout; this decides the hit areas.
 */
export function useCoarsePointer(): boolean {
  return useMediaQuery(COARSE);
}
