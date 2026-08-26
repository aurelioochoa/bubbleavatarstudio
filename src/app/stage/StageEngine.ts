// StageEngine: high-frequency frame loop writing SVG straight to the DOM
// (FR-11). React never re-renders per frame; the engine owns only live values.
import { liveFrame, moodScene, restingScene } from "../../render/scene";
import type { MoodSample } from "../../domain/playback/LoopPlayer";
import { sceneToSvg } from "../../render/svg";
import type { Bubble, Kit } from "../../domain/document/types";
import type { StageClock } from "./clock";
import { approachPose } from "../../domain/geometry/follow";
import type { HeadPose } from "../../domain/document/types";

/**
 * How much of the remaining angle the head closes each frame while following.
 *
 * Proportional, so the turn eases out as it arrives rather than stopping dead,
 * and low enough that a cursor thrown across the screen reads as a head
 * turning to look rather than as a jump cut.
 */
const FOLLOW_EASE = 0.15;

/**
 * Transport state (FR-6.2). `paused` freezes the frame in place; `stopped`
 * rewinds to the first step and shows the resting face, which keeps breathing
 * with ambient idle motion (FR-7).
 */
export type StageMode = "playing" | "paused" | "stopped";

export interface StageEngineOptions {
  bubble: Bubble;
  kit: Kit;
  loopId: string | null;
  mode: StageMode;
  headRotation: { x: number; y: number; z: number };
  /** A mood held on the stage while the user picks or edits it (FR-4.4). */
  preview: MoodSample | null;
  /** Draw the projection guide over the character (FR-8.4). */
  guide: boolean;
  /**
   * FR-8.6: while true, the engine eases the head toward `followTarget` on
   * every frame instead of taking `headRotation` as given.
   *
   * The pose lives here for the length of the follow rather than in React,
   * because easing means a new angle per frame and FR-11.2 keeps the tree out
   * of that path. `onFollowEnd` hands it back when the follow stops, so Esc,
   * the gizmo and the readout all resume from where the character is.
   */
  follow?: boolean;
  /**
   * Where the cursor is asking the head to point, read fresh each frame.
   *
   * A getter, not a value. The stage writes the aim on every pointer event
   * without re-rendering — that is the whole point of keeping it in a ref —
   * so a value passed through `update()` would be whatever it was when React
   * last rendered, which is `null` for the entire follow.
   */
  aim?: (() => { x: number; y: number } | null) | undefined;
  /** Called once when following ends, with the pose the character came to rest in. */
  onFollowEnd?: ((head: HeadPose) => void) | undefined;
  /**
   * Where elapsed playback time is published for the track's playhead
   * (FR-6.7). Optional: the engine renders the same frames without one, and
   * every test that only cares about the SVG leaves it out.
   */
  clock?: StageClock | undefined;
}

/** A frame longer than this means the tab slept; charge a nominal frame instead. */
const MAX_FRAME_MS = 1000;
const NOMINAL_FRAME_MS = 16;

export class StageEngine {
  private host: HTMLElement;
  private opts: StageEngineOptions;
  private raf = 0;
  /** Elapsed time inside the current loop; rewound by stop and loop changes. */
  private loopMs = 0;
  /** Elapsed time driving ambient idle motion; never rewound. */
  private ambientMs = 0;
  private lastTickMs: number | null = null;
  private lastSvg = "";
  private unseek: (() => void) | null = null;
  /** The pose the follow owns while it runs; null when React owns it again. */
  private followPose: HeadPose | null = null;

  constructor(host: HTMLElement, opts: StageEngineOptions) {
    this.host = host;
    this.opts = opts;
  }

  update(opts: StageEngineOptions): void {
    const loopChanged = opts.loopId !== this.opts.loopId;
    const wasFollowing = this.opts.follow ?? false;
    this.opts = opts;
    if (loopChanged || opts.mode === "stopped") this.loopMs = 0;
    // Entering a follow seeds from wherever React last left the head, so the
    // character eases on from its current pose instead of snapping to centre.
    if ((opts.follow ?? false) && !wasFollowing) {
      this.followPose = opts.headRotation;
    }
    // Leaving one hands the pose back exactly once. Without this the shell
    // still holds the pose from before the follow, and the character would
    // jump back to it on the next React render.
    if (!(opts.follow ?? false) && wasFollowing) {
      const settled = this.followPose;
      this.followPose = null;
      if (settled) this.opts.onFollowEnd?.(settled);
    }
    this.renderFrame();
  }

  start(): void {
    // FR-6.7: a scrub moves this clock from the track. Bound for the life of
    // the loop; the clock a running engine reads is not swapped.
    this.unseek =
      this.opts.clock?.onSeek((ms) => {
        this.loopMs = Math.max(0, ms);
        this.renderFrame();
      }) ?? null;
    const tick = () => {
      this.renderFrame();
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  stop(): void {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.unseek?.();
    this.unseek = null;
  }

  private now(): number {
    return typeof performance !== "undefined" ? performance.now() : Date.now();
  }

  /** Charges elapsed wall time to the clocks the current mode lets run. */
  private advanceClocks(t: number): void {
    const previous = this.lastTickMs ?? t;
    this.lastTickMs = t;
    const delta = t - previous;
    const dt = delta < 0 || delta > MAX_FRAME_MS ? NOMINAL_FRAME_MS : delta;
    switch (this.opts.mode) {
      case "playing":
        this.loopMs += dt;
        this.ambientMs += dt;
        return;
      case "stopped":
        // The resting face still breathes while nothing plays.
        this.ambientMs += dt;
        return;
      case "paused":
        // Everything holds where it was.
        return;
    }
  }

  /**
   * The head for this frame: eased toward the cursor while following, and
   * whatever React holds otherwise.
   *
   * A follow with no target yet — the toggle is on but the pointer has not
   * moved — holds the pose rather than pulling the character to centre, so
   * turning it on is not itself a movement.
   */
  private stepFollow(): HeadPose {
    const { follow, aim, headRotation } = this.opts;
    if (!(follow ?? false) || !this.followPose) return headRotation;
    const target = aim?.() ?? null;
    if (!target) return this.followPose;
    this.followPose = approachPose(this.followPose, target, FOLLOW_EASE);
    return this.followPose;
  }

  private renderFrame(): void {
    this.advanceClocks(this.now());
    const { bubble, kit, loopId, mode, preview, guide } = this.opts;
    const headRotation = this.stepFollow();
    // The stage is the one caller that asks for chrome: the guide when the
    // user toggles it, the contact shadow always — this is where the volume
    // is being judged, and the exported character has no ground to sit on.
    const chrome = { guide, shadow: true };
    let scene;
    if (preview) {
      // Manual selection owns the live state while it lasts (FR-6.1).
      scene = moodScene(bubble, preview, this.ambientMs, headRotation, chrome);
    } else if (loopId && mode !== "stopped") {
      scene = liveFrame(
        bubble,
        kit,
        loopId,
        this.loopMs,
        headRotation,
        chrome,
      ).scene;
    } else {
      scene = restingScene(bubble, this.ambientMs, headRotation, chrome);
    }
    // Published before the write, and whatever the scene turned out to be: a
    // paused stage skips the DOM write below, and its playhead must still hold
    // its position rather than going quiet. `stopped` carries no loop, which
    // is what parks the playhead at the origin.
    this.opts.clock?.publish({
      loopId: mode === "stopped" ? null : loopId,
      loopMs: this.loopMs,
      head: headRotation,
    });
    const svg = sceneToSvg(scene);
    // A paused stage re-serializes to the same bytes every frame; skip the write.
    if (svg === this.lastSvg) return;
    this.lastSvg = svg;
    this.host.innerHTML = svg;
  }
}
