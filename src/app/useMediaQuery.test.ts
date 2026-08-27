// FR-12.1: three layouts chosen by width alone, and one place that decides
// which. Everything the studio adapts that CSS can express stays in CSS; this
// hook exists for the differences CSS cannot make — a rail that is a column in
// one shell and a strip in another, an inspector that is a sheet.
//
// The queries are asserted as literals on purpose. They have to stay the same
// numbers Tailwind's `md:` and `lg:` variants use (48rem / 64rem), or the CSS
// half of an adaptation would switch at a different width from the JS half,
// which is the kind of drift nothing else would catch.
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import {
  useBreakpoint,
  useCoarsePointer,
  useMediaQuery,
} from "./useMediaQuery";

interface FakeList {
  media: string;
  matches: boolean;
  listeners: Set<(e: MediaQueryListEvent) => void>;
  addEventListener: (t: "change", fn: (e: MediaQueryListEvent) => void) => void;
  removeEventListener: (
    t: "change",
    fn: (e: MediaQueryListEvent) => void,
  ) => void;
}

/** A controllable `matchMedia`: jsdom ships none at all. */
function installMatchMedia(initial: Record<string, boolean> = {}) {
  const lists = new Map<string, FakeList>();
  vi.stubGlobal("matchMedia", (media: string) => {
    let list = lists.get(media);
    if (!list) {
      const l: FakeList = {
        media,
        matches: initial[media] ?? false,
        listeners: new Set(),
        addEventListener: (_t, fn) => l.listeners.add(fn),
        removeEventListener: (_t, fn) => l.listeners.delete(fn),
      };
      list = l;
      lists.set(media, l);
    }
    return list as unknown as MediaQueryList;
  });
  return {
    /** Move a query and tell whoever is listening, the way a resize would. */
    set(media: string, matches: boolean) {
      const list = lists.get(media);
      if (!list) throw new Error(`nothing ever queried ${media}`);
      list.matches = matches;
      act(() => {
        for (const fn of [...list.listeners])
          fn({ matches } as MediaQueryListEvent);
      });
    },
    listeners: (media: string) => lists.get(media)?.listeners.size ?? 0,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useMediaQuery", () => {
  it("reports what the query already matches on the first render", () => {
    installMatchMedia({ "(min-width: 64rem)": true });
    const { result } = renderHook(() => useMediaQuery("(min-width: 64rem)"));
    expect(result.current).toBe(true);
  });

  it("follows the query when it changes", () => {
    const mm = installMatchMedia({ "(min-width: 64rem)": true });
    const { result } = renderHook(() => useMediaQuery("(min-width: 64rem)"));

    mm.set("(min-width: 64rem)", false);

    expect(result.current).toBe(false);
  });

  it("drops its listener on unmount", () => {
    const mm = installMatchMedia();
    const { unmount } = renderHook(() => useMediaQuery("(pointer: coarse)"));
    expect(mm.listeners("(pointer: coarse)")).toBe(1);

    unmount();

    expect(mm.listeners("(pointer: coarse)")).toBe(0);
  });

  /**
   * The runtime renders on a server (`src/runtime` is SSR-safe) and the studio
   * boots inside embedders that predate `matchMedia`. Neither should throw;
   * both should get the desktop shell, which is the layout that assumes least
   * about the pointer.
   */
  it("answers false rather than throwing where matchMedia does not exist", () => {
    vi.stubGlobal("matchMedia", undefined);
    const { result } = renderHook(() => useMediaQuery("(min-width: 64rem)"));
    expect(result.current).toBe(false);
  });
});

describe("useBreakpoint (FR-12.1)", () => {
  it("is phone below 768px", () => {
    installMatchMedia({});
    const { result } = renderHook(() => useBreakpoint());
    expect(result.current).toBe("phone");
  });

  it("is tablet from 768px until 1024px", () => {
    installMatchMedia({ "(min-width: 48rem)": true });
    const { result } = renderHook(() => useBreakpoint());
    expect(result.current).toBe("tablet");
  });

  it("is desktop from 1024px up", () => {
    installMatchMedia({
      "(min-width: 48rem)": true,
      "(min-width: 64rem)": true,
    });
    const { result } = renderHook(() => useBreakpoint());
    expect(result.current).toBe("desktop");
  });

  it("crosses from phone to desktop as the window grows, without a remount", () => {
    const mm = installMatchMedia({});
    const { result } = renderHook(() => useBreakpoint());
    expect(result.current).toBe("phone");

    mm.set("(min-width: 48rem)", true);
    expect(result.current).toBe("tablet");

    mm.set("(min-width: 64rem)", true);
    expect(result.current).toBe("desktop");
  });

  /**
   * Where nothing can be measured the answer is desktop: it is the shell the
   * studio shipped with, and the one that degrades most gracefully if the
   * guess is wrong — a phone showing three columns is cramped, where a desktop
   * showing a bottom sheet is simply wrong.
   */
  it("is desktop where matchMedia does not exist", () => {
    vi.stubGlobal("matchMedia", undefined);
    const { result } = renderHook(() => useBreakpoint());
    expect(result.current).toBe("desktop");
  });
});

describe("useCoarsePointer (FR-12.5)", () => {
  it("reads the pointer, not the width — a touchscreen laptop is coarse and wide", () => {
    installMatchMedia({
      "(pointer: coarse)": true,
      "(min-width: 48rem)": true,
      "(min-width: 64rem)": true,
    });
    const { result } = renderHook(() => ({
      coarse: useCoarsePointer(),
      at: useBreakpoint(),
    }));
    expect(result.current).toEqual({ coarse: true, at: "desktop" });
  });

  it("is false for a mouse", () => {
    installMatchMedia({});
    const { result } = renderHook(() => useCoarsePointer());
    expect(result.current).toBe(false);
  });
});
