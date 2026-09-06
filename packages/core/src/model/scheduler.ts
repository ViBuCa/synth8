import type { Synth8AudioBackend, Synth8Event } from "./event";
import type { Synth8Pattern } from "./pattern";

export interface AudioClock {
  readonly currentTime: number;
}

export type SchedulerOptions = {
  lookAhead?: number;
  updateInterval?: number;
};

/**
 * Small backend-neutral look-ahead scheduler. It is intentionally driven by
 * tick(), so a host can use setInterval, requestAnimationFrame, or a game
 * loop without making Tone.Transport part of the musical model.
 */
export class Synth8Scheduler {
  private scheduledUntil = 0;
  private running = false;
  private timer: ReturnType<typeof setInterval> | undefined;
  private readonly lookAhead: number;
  private readonly updateInterval: number;

  constructor(
    private readonly pattern: Synth8Pattern,
    private readonly backend: Synth8AudioBackend,
    private readonly clock: AudioClock,
    options: SchedulerOptions = {},
  ) {
    this.lookAhead = Math.max(0, options.lookAhead ?? 0.1);
    this.updateInterval = Math.max(0.001, options.updateInterval ?? 0.05);
  }

  /** Schedule one window. Public for deterministic tests and custom hosts. */
  tick(): Synth8Event[] {
    if (!this.running) return [];
    const start = this.scheduledUntil;
    const end = Math.max(start, this.clock.currentTime + this.lookAhead);
    if (end <= start) return [];
    const events = this.pattern.query(start, end);
    this.backend.schedule(events);
    this.scheduledUntil = end;
    return events;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.tick();
    this.timer = setInterval(() => this.tick(), this.updateInterval * 1000);
  }

  pause(): void {
    this.running = false;
    if (this.timer !== undefined) clearInterval(this.timer);
    this.timer = undefined;
  }

  resume(): void { this.start(); }

  stop(): void {
    this.pause();
    this.scheduledUntil = 0;
  }

  get isRunning(): boolean { return this.running; }
  get nextScheduledTime(): number { return this.scheduledUntil; }
}
