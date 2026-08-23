// FR-9 reducer semantics + persistence.
import { describe, expect, it, vi } from "vitest";
import { initialStudioState, studioReducer } from "./store";
import {
  createAutosaver,
  loadDocument,
  saveDocument,
  STORAGE_KEY,
} from "../persistence";
import { createDefaultDocument } from "../../domain/document/create";
import { effectiveKit } from "../../domain/document/mutate";

describe("studioReducer", () => {
  const state = initialStudioState();

  it("adds a bubble and activates it", () => {
    const next = studioReducer(state, { type: "bubble/add", name: "Pip" });
    expect(next.doc.bubbles).toHaveLength(2);
    expect(next.doc.activeBubbleId).toBe(next.doc.bubbles[1].id);
  });

  it("first mood edit forks the kit (copy-on-write)", () => {
    const s = studioReducer(state, { type: "mood/add", name: "wink" });
    const bubble = s.doc.bubbles.find((b) => b.id === s.doc.activeBubbleId);
    if (!bubble) throw new Error("no active bubble");
    expect(bubble.ownKit).not.toBeNull();
  });

  it("rejecting a referenced-mood delete sets lastError and keeps the doc", () => {
    const moodId = state.doc.starterKit.loops[0].steps[0].moodId;
    const s = studioReducer(state, { type: "mood/remove", moodId });
    expect(s.doc).toBe(state.doc);
    expect(s.lastError?.code).toBe("E_REF");
  });

  it("invalid mutation results are discarded (transactional)", () => {
    const s = studioReducer(state, { type: "eye/spacing", spacing: -5 });
    // -5 passes mutate but fails validation → doc unchanged.
    expect(s.doc).toBe(state.doc);
    expect(s.lastError).toBeNull();
  });

  it("load only accepts valid documents", () => {
    const s = studioReducer(state, {
      type: "load",
      doc: { version: 2 } as never,
    });
    expect(s.doc).toBe(state.doc);
    const ok = studioReducer(state, {
      type: "load",
      doc: createDefaultDocument(),
    });
    expect(ok.doc.version).toBe(1);
  });

  it("locale switch keeps the document otherwise intact", () => {
    const s = studioReducer(state, { type: "locale", locale: "en" });
    expect(s.doc.locale).toBe("en");
    expect(s.doc.bubbles).toEqual(state.doc.bubbles);
  });
});

describe("persistence", () => {
  it("saves and loads round-trip", () => {
    const doc = createDefaultDocument();
    saveDocument(doc);
    expect(loadDocument()).toEqual(doc);
  });

  it("autosaver debounces within ≤300ms and flushes", () => {
    vi.useFakeTimers();
    const saver = createAutosaver(300);
    const setSpy = vi.spyOn(Storage.prototype, "setItem");
    saver.push({ a: 1 });
    saver.push({ a: 2 });
    expect(setSpy).not.toHaveBeenCalled();
    vi.advanceTimersByTime(300);
    expect(setSpy).toHaveBeenCalledTimes(1);
    expect(loadDocument()).toEqual({ a: 2 });
    saver.cancel();
    vi.useRealTimers();
    setSpy.mockRestore();
  });

  it("corrupt storage yields null, not a crash", () => {
    globalThis.localStorage?.setItem(STORAGE_KEY, "{oops");
    expect(loadDocument()).toBeNull();
  });
});

describe("effectiveKit through the store", () => {
  it("kit/reset returns to starter kit", () => {
    let s = studioReducer(initialStudioState(), {
      type: "mood/add",
      name: "w",
    });
    s = studioReducer(s, { type: "kit/reset" });
    const bubble = s.doc.bubbles.find((b) => b.id === s.doc.activeBubbleId);
    if (!bubble) throw new Error("no bubble");
    expect(bubble.ownKit).toBeNull();
    expect(effectiveKit(bubble, s.doc)).toBe(s.doc.starterKit);
  });
});
