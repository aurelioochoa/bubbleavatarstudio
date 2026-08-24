// StageEngine: high-frequency frame loop writing SVG straight to the DOM
// (FR-11). React never re-renders per frame; the engine owns only live values.
import { liveFrame, restingScene } from "../../render/scene";
import { sceneToSvg } from "../../render/svg";
import type { Bubble, Kit } from "../../domain/document/types";

export interface StageEngineOptions {
  bubble: Bubble;
  kit: Kit;
  loopId: string | null;
  playing: boolean;
  headRotation: { x: number; y: number; z: number };
}

export class StageEngine {
  private host: HTMLElement;
  private opts: StageEngineOptions;
  private raf = 0;
  private startMs = 0;
  private lastFrameMs = 0;

  constructor(host: HTMLElement, opts: StageEngineOptions) {
    this.host = host;
    this.opts = opts;
  }

  update(opts: StageEngineOptions): void {
    const loopChanged = opts.loopId !== this.opts.loopId;
    this.opts = opts;
    if (loopChanged) this.startMs = this.now();
    if (!opts.playing) this.renderFrame(); // render once for paused edits
  }

  start(): void {
    this.startMs = this.now();
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

  private renderFrame(): void {
    const t = this.now();
    // Cap effective delta to avoid jumps after tab sleep.
    if (t - this.lastFrameMs > 1000) this.startMs += t - this.lastFrameMs - 16;
    this.lastFrameMs = t;
    const elapsed = t - this.startMs;
    // No loop to play (empty kit, or nothing selected): the resting face still
    // breathes with ambient motion (FR-6.2, FR-7).
    const scene = this.opts.loopId
      ? liveFrame(
          this.opts.bubble,
          this.opts.kit,
          this.opts.loopId,
          elapsed,
          this.opts.headRotation,
        ).scene
      : restingScene(this.opts.bubble, elapsed, this.opts.headRotation);
    this.host.innerHTML = sceneToSvg(scene);
  }
}
