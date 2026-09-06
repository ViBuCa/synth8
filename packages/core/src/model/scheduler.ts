import type { Synth8AudioBackend, Synth8Event } from "./event";
import type { Synth8Pattern } from "./pattern";

export interface AudioClock {
  readonly currentTime: number;
}

export type SchedulerOptions = {
  /** Audio-clock seconds to schedule ahead. */
  lookAhead?: number;
  /** Polling interval in seconds. */
  updateInterval?: number;
  /** Musical tempo used to convert audio-clock seconds to beats. */
  bpm?: number;
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
  private readonly bpm: number;
  private origin = 0;

  constructor(
    private readonly pattern: Synth8Pattern,
    private readonly backend: Synth8AudioBackend,
    private readonly clock: AudioClock,
    options: SchedulerOptions = {},
  ) {
    this.lookAhead = Math.max(0, options.lookAhead ?? 0.1);
    this.updateInterval = Math.max(0.001, options.updateInterval ?? 0.05);
    this.bpm = Math.max(1, options.bpm ?? 120);
  }

  /** Schedule one window. Public for deterministic tests and custom hosts. */
  tick(): Synth8Event[] {
    if (!this.running) return [];
    const start = this.scheduledUntil;
    const musicalNow = Math.max(0, (this.clock.currentTime - this.origin) * this.bpm / 60);
    const end = Math.max(start, musicalNow + this.lookAhead * this.bpm / 60);
    if (end <= start) return [];
    const events = this.pattern.query(start, end);
    this.backend.schedule(events);
    this.scheduledUntil = end;
    return events;
  }

  start(): void {
    if (this.running) return;
    if (this.scheduledUntil === 0) {
      this.origin = this.clock.currentTime;
      this.backend.start?.();
    }
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
    this.backend.stop?.();
  }

  get isRunning(): boolean { return this.running; }
  get nextScheduledTime(): number { return this.scheduledUntil; }
}
