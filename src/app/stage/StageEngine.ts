// StageEngine: high-frequency frame loop writing SVG straight to the DOM
// (FR-11). React never re-renders per frame; the engine owns only live values.
import { liveFrame, moodScene, restingScene } from "../../render/scene";
import type { MoodSample } from "../../domain/playback/LoopPlayer";
import { sceneToSvg } from "../../render/svg";
import type { Bubble, Kit } from "../../domain/document/types";

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

  constructor(host: HTMLElement, opts: StageEngineOptions) {
    this.host = host;
    this.opts = opts;
  }

  update(opts: StageEngineOptions): void {
    const loopChanged = opts.loopId !== this.opts.loopId;
    this.opts = opts;
    if (loopChanged || opts.mode === "stopped") this.loopMs = 0;
    this.renderFrame();
  }

  start(): void {
    const tick = () => {
      this.renderFrame();
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  stop(): void {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
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

  private renderFrame(): void {
    this.advanceClocks(this.now());
    const { bubble, kit, loopId, mode, headRotation, preview } = this.opts;
    let scene;
    if (preview) {
      // Manual selection owns the live state while it lasts (FR-6.1).
      scene = moodScene(bubble, preview, this.ambientMs, headRotation);
    } else if (loopId && mode !== "stopped") {
      scene = liveFrame(bubble, kit, loopId, this.loopMs, headRotation).scene;
    } else {
      scene = restingScene(bubble, this.ambientMs, headRotation);
    }
    const svg = sceneToSvg(scene);
    // A paused stage re-serializes to the same bytes every frame; skip the write.
    if (svg === this.lastSvg) return;
    this.lastSvg = svg;
    this.host.innerHTML = svg;
  }
}
