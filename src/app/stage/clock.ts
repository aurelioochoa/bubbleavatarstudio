// The seam between the engine's frame loop and the track's playhead (FR-6.7).
//
// FR-11.2 keeps React out of the per-frame path: the engine writes SVG straight
// into its host element and never re-renders the tree. The playhead has the
// same problem and needs the same answer — the engine publishes elapsed time
// here from inside its rAF callback, and the track subscribes and writes
// `style.left` and `textContent` on nodes it holds by ref. Neither side imports
// the other, and nothing in this file touches React or the DOM.
export interface StageFrame {
  /** The loop the elapsed time belongs to; null while nothing plays. */
  loopId: string | null;
  /** Milliseconds since that loop started — the clock LoopPlayer walks. */
  loopMs: number;
}

export interface StageClock {
  /** Called from the engine's frame loop. Never throws. */
  publish(frame: StageFrame): void;
  /** Delivers the frame already on the clock, then every later one. */
  subscribe(cb: (frame: StageFrame) => void): () => void;
  /** The newest frame, or null before the engine has published one. */
  last(): StageFrame | null;
}

export function createStageClock(): StageClock {
  const subscribers = new Set<(frame: StageFrame) => void>();
  let current: StageFrame | null = null;

  /**
   * A subscriber that throws must not take the frame loop down with it: this
   * runs inside requestAnimationFrame, so an exception here would stop the
   * character animating because a readout failed to format a number.
   */
  const deliver = (cb: (frame: StageFrame) => void, frame: StageFrame): void => {
    try {
      cb(frame);
    } catch {
      // Swallowed on purpose — see above.
    }
  };

  return {
    publish(frame) {
      current = frame;
      for (const cb of subscribers) deliver(cb, frame);
    },
    subscribe(cb) {
      subscribers.add(cb);
      // The track mounts beside the stage, which may already have rendered a
      // frame — and on a paused stage there is no next one to wait for.
      if (current !== null) deliver(cb, current);
      return () => {
        subscribers.delete(cb);
      };
    },
    last() {
      return current;
    },
  };
}
