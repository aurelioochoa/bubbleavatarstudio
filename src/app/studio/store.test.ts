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

  const kitOf = (st: ReturnType<typeof initialStudioState>) => {
    const b = st.doc.bubbles.find((x) => x.id === st.doc.activeBubbleId);
    if (!b) throw new Error("no active bubble");
    return effectiveKit(b, st.doc);
  };

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
      doc: { version: 5 } as never,
    });
    expect(s.doc).toBe(state.doc);
    const ok = studioReducer(state, {
      type: "load",
      doc: createDefaultDocument(),
    });
    expect(ok.doc.version).toBe(4);
  });

  it("locale switch keeps the document otherwise intact", () => {
    const s = studioReducer(state, { type: "locale", locale: "en" });
    expect(s.doc.locale).toBe("en");
    expect(s.doc.bubbles).toEqual(state.doc.bubbles);
  });

  it("reorders bubbles (FR-1.4)", () => {
    let s = studioReducer(state, { type: "bubble/add", name: "Two" });
    const ids = s.doc.bubbles.map((b) => b.id);
    s = studioReducer(s, { type: "bubble/reorder", ids: [ids[1], ids[0]] });
    expect(s.doc.bubbles.map((b) => b.id)).toEqual([ids[1], ids[0]]);
  });

  it("extra add/update/remove round-trip (FR-2.4)", () => {
    let s = studioReducer(state, {
      type: "extra/add",
      extra: {
        kind: "circle",
        width: 24,
        height: 24,
        depth: 24,
        roundness: 1,
        x: 0,
        y: -70,
        rotationDeg: 0,
        z: 1,
        colorRole: "accent",
        color: "#ff0055",
      },
    });
    const active = () =>
      s.doc.bubbles.find((b) => b.id === s.doc.activeBubbleId);
    expect(active()?.body.extras).toHaveLength(1);
    const extraId = active()?.body.extras[0].id;
    if (!extraId) throw new Error("extra id missing");
    s = studioReducer(s, {
      type: "extra/update",
      extraId,
      patch: { width: 40 },
    });
    expect(active()?.body.extras[0].width).toBe(40);
    s = studioReducer(s, { type: "extra/remove", extraId });
    expect(active()?.body.extras).toHaveLength(0);
  });

  it("reorders steps via action (FR-5.2)", () => {
    const loop = state.doc.starterKit.loops[0];
    const stepIds = loop.steps.map((st) => st.id);
    const s = studioReducer(state, {
      type: "step/reorder",
      loopId: loop.id,
      stepIds: [stepIds[1], stepIds[0], stepIds[2]],
    });
    const reordered = kitOf(s).loops.find((l) => l.id === loop.id);
    expect(reordered?.steps.map((st) => st.id)).toEqual([
      stepIds[1],
      stepIds[0],
      stepIds[2],
    ]);
  });

  it("duplicates and reorders moods, duplicates loops (FR-4.2, FR-5.2)", () => {
    const happy = state.doc.starterKit.moods[0];
    let s = studioReducer(state, { type: "mood/duplicate", moodId: happy.id });
    expect(kitOf(s).moods.map((m) => m.name)).toContain("happy copy");

    const greet = state.doc.starterKit.loops[1];
    s = studioReducer(s, { type: "loop/duplicate", loopId: greet.id });
    expect(kitOf(s).loops.map((l) => l.name)).toContain("greet copy");

    const currentMoods = kitOf(s).moods.map((m) => m.id);
    s = studioReducer(s, {
      type: "mood/reorder",
      ids: currentMoods.slice().reverse(),
    });
    expect(kitOf(s).moods.map((m) => m.id)).toEqual(
      currentMoods.slice().reverse(),
    );
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

describe("library top-up through the store (FR-4.7, FR-5.7)", () => {
  /** A project saved before the library grew: it kept the kit it was saved with. */
  const staleState = () => {
    const base = initialStudioState();
    const full = base.doc.starterKit;
    return {
      base,
      full,
      state: {
        doc: {
          ...base.doc,
          starterKit: { moods: full.moods.slice(0, 2), loops: [] },
        },
        lastError: null,
      },
    };
  };

  it("library/topUp appends what the kit lacks", () => {
    const { full, state } = staleState();
    const s = studioReducer(state, { type: "library/topUp" });
    expect(s.doc.starterKit.moods).toHaveLength(full.moods.length);
    expect(s.doc.starterKit.loops).toHaveLength(full.loops.length);
    expect(s.lastError).toBeNull();
  });

  it("keeps the two moods the kit already had, ids and all", () => {
    const { state } = staleState();
    const kept = state.doc.starterKit.moods;
    const s = studioReducer(state, { type: "library/topUp" });
    expect(s.doc.starterKit.moods.slice(0, 2)).toEqual(kept);
  });

  it("tops up the shared kit without forking an inheriting bubble", () => {
    const { state } = staleState();
    const s = studioReducer(state, { type: "library/topUp" });
    expect(s.doc.bubbles.every((b) => b.ownKit === null)).toBe(true);
  });
});
