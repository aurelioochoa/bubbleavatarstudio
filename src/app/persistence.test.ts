// FR-9.2 autosave, and FR-9.6's reason for existing: the save is silent, and
// silence is indistinguishable from failure. `saveDocument` says whether it
// worked and the autosaver passes that on, so the header can state it.
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  STORAGE_KEY,
  createAutosaver,
  loadDocument,
  saveDocument,
} from "./persistence";

beforeEach(() => {
  globalThis.localStorage.clear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/**
 * A storage of our own rather than a spy on jsdom's: `localStorage` is reached
 * through a getter, so a spy installed on the object it returns is not
 * reliably the one `saveDocument` ends up calling.
 */
function fakeStorage(opts: { refuse?: boolean } = {}) {
  const map = new Map<string, string>();
  const setItem = vi.fn((k: string, v: string) => {
    if (opts.refuse) throw new Error("QuotaExceededError");
    map.set(k, v);
  });
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => map.get(k) ?? null,
    setItem,
    removeItem: (k: string) => map.delete(k),
    clear: () => {
      map.clear();
    },
  });
  return { setItem, map };
}

describe("saveDocument (FR-9.2, FR-9.6)", () => {
  it("writes the document and says it worked", () => {
    expect(saveDocument({ hello: 1 })).toBe(true);
    expect(loadDocument()).toEqual({ hello: 1 });
  });

  it("says it did not, rather than throwing, when storage refuses", () => {
    // A full or blocked store is the case the header exists to surface; the
    // app must keep running and the export must stay available either way.
    fakeStorage({ refuse: true });
    expect(saveDocument({ hello: 1 })).toBe(false);
  });
});

describe("createAutosaver (FR-9.2)", () => {
  it("coalesces a burst into one write", () => {
    const { setItem } = fakeStorage();
    const saver = createAutosaver(300);
    saver.push({ n: 1 });
    saver.push({ n: 2 });
    saver.push({ n: 3 });
    vi.advanceTimersByTime(300);
    expect(setItem).toHaveBeenCalledTimes(1);
    expect(loadDocument()).toEqual({ n: 3 });
  });

  it("reports each save to whoever is listening", () => {
    const onSaved = vi.fn();
    const saver = createAutosaver(300, onSaved);
    saver.push({ n: 1 });
    expect(onSaved).not.toHaveBeenCalled();
    vi.advanceTimersByTime(300);
    expect(onSaved).toHaveBeenCalledWith(true);
  });

  it("reports a refused save as a failure, not as a save", () => {
    fakeStorage({ refuse: true });
    const onSaved = vi.fn();
    const saver = createAutosaver(300, onSaved);
    saver.push({ n: 1 });
    vi.advanceTimersByTime(300);
    expect(onSaved).toHaveBeenCalledWith(false);
  });

  it("flush writes immediately and still reports (FR-9.2)", () => {
    const onSaved = vi.fn();
    const saver = createAutosaver(300, onSaved);
    saver.push({ n: 7 });
    saver.flush();
    expect(loadDocument()).toEqual({ n: 7 });
    expect(onSaved).toHaveBeenCalledWith(true);
  });

  it("flush with nothing pending reports nothing", () => {
    // Otherwise a pagehide on an untouched document would announce a save
    // that never happened.
    const onSaved = vi.fn();
    createAutosaver(300, onSaved).flush();
    expect(onSaved).not.toHaveBeenCalled();
    expect(globalThis.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("cancel drops the pending write", () => {
    const saver = createAutosaver(300);
    saver.push({ n: 1 });
    saver.cancel();
    vi.advanceTimersByTime(1000);
    expect(loadDocument()).toBeNull();
  });
});
