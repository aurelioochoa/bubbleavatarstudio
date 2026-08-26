// FR-6.7 / FR-11.2: the track's playhead moves every frame, and React must not
// re-render for it. The clock is the seam that makes that possible — the engine
// publishes into it from inside its rAF loop, the track subscribes and writes
// the DOM by hand. Nothing here touches React or the DOM, so it can be tested
// as what it is: a one-value publisher.
import { describe, expect, it, vi } from "vitest";
import { createStageClock, type StageFrame } from "./clock";

const frame = (over: Partial<StageFrame> = {}): StageFrame => ({
  loopId: "loop_1",
  loopMs: 0,
  ...over,
});

describe("createStageClock", () => {
  it("delivers each published frame to every subscriber", () => {
    const clock = createStageClock();
    const a = vi.fn();
    const b = vi.fn();
    clock.subscribe(a);
    clock.subscribe(b);
    const f = frame({ loopMs: 120 });
    clock.publish(f);
    expect(a).toHaveBeenCalledWith(f);
    expect(b).toHaveBeenCalledWith(f);
  });

  it("hands a late subscriber the frame already on the clock", () => {
    // The engine starts with the stage; the track mounts alongside it. Without
    // this, a track that subscribed a tick late would render an empty playhead
    // until the next frame — and on a paused stage there is no next frame.
    const clock = createStageClock();
    clock.publish(frame({ loopMs: 900 }));
    const late = vi.fn();
    clock.subscribe(late);
    expect(late).toHaveBeenCalledWith(frame({ loopMs: 900 }));
  });

  it("has nothing to hand a subscriber before the first frame", () => {
    const clock = createStageClock();
    const first = vi.fn();
    clock.subscribe(first);
    expect(first).not.toHaveBeenCalled();
    expect(clock.last()).toBeNull();
  });

  it("stops delivering once the subscription is released", () => {
    const clock = createStageClock();
    const cb = vi.fn();
    const off = clock.subscribe(cb);
    off();
    clock.publish(frame({ loopMs: 40 }));
    expect(cb).not.toHaveBeenCalled();
  });

  it("releasing twice is not an error, and does not take anyone else down", () => {
    const clock = createStageClock();
    const gone = vi.fn();
    const kept = vi.fn();
    const off = clock.subscribe(gone);
    clock.subscribe(kept);
    off();
    off();
    clock.publish(frame());
    expect(kept).toHaveBeenCalledTimes(1);
  });

  it("keeps the frame loop running when a subscriber throws", () => {
    // publish() is called from inside requestAnimationFrame. A subscriber that
    // throws there would take the engine's own rendering down with it, so the
    // character would freeze because a readout failed to format a number.
    const clock = createStageClock();
    const bad = vi.fn(() => {
      throw new Error("bad subscriber");
    });
    const good = vi.fn();
    clock.subscribe(bad);
    clock.subscribe(good);
    expect(() => {
      clock.publish(frame());
    }).not.toThrow();
    expect(good).toHaveBeenCalledTimes(1);
  });

  it("remembers the newest frame, not the first", () => {
    const clock = createStageClock();
    clock.publish(frame({ loopMs: 10 }));
    clock.publish(frame({ loopMs: 20 }));
    expect(clock.last()).toEqual(frame({ loopMs: 20 }));
  });

  it("says which loop the elapsed time belongs to, or that none plays", () => {
    // The track reads `loopMs` against the loop it is drawing. A frame from a
    // resting or previewing stage carries no loop, and the playhead parks.
    const clock = createStageClock();
    clock.publish(frame({ loopId: null, loopMs: 0 }));
    expect(clock.last()?.loopId).toBeNull();
  });
});

// FR-6.7: a scrub is the same seam travelling the other way — the UI moving
// the engine's loop clock, rather than the engine reporting it.
describe("createStageClock seeking", () => {
  it("hands a seek to the engine listening for one", () => {
    const clock = createStageClock();
    const seek = vi.fn();
    clock.onSeek(seek);
    clock.seek(1200);
    expect(seek).toHaveBeenCalledWith(1200);
  });

  it("drops a seek with no engine listening rather than throwing", () => {
    // The track renders before the engine mounts in a test that renders it
    // alone, and a scrub there is a no-op, not a crash.
    const clock = createStageClock();
    expect(() => {
      clock.seek(400);
    }).not.toThrow();
  });

  it("keeps one listener, so a remounted engine replaces the old one", () => {
    const clock = createStageClock();
    const first = vi.fn();
    const second = vi.fn();
    clock.onSeek(first);
    clock.onSeek(second);
    clock.seek(90);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith(90);
  });

  it("releasing a listener that was already replaced leaves the new one", () => {
    const clock = createStageClock();
    const off = clock.onSeek(vi.fn());
    const live = vi.fn();
    clock.onSeek(live);
    off();
    clock.seek(7);
    expect(live).toHaveBeenCalledWith(7);
  });
});
