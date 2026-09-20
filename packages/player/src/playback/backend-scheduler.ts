import type { AudioClock, Synth8AudioBackend, Synth8Event, Synth8Pattern } from "@vibuca/synth8-core";

/** Player-local runtime scheduler to keep tests usable before core is built. */
export class BackendScheduler {
  private scheduledUntil = 0;
  private running = false;
  private timer: ReturnType<typeof setInterval> | undefined;
  private origin = 0;
  private readonly lookAhead: number;
  private readonly updateInterval: number;
  private readonly bpm: number;
  private pausedPosition = 0;

  constructor(
    private readonly pattern: Synth8Pattern,
    private readonly backend: Synth8AudioBackend,
    private readonly clock: AudioClock,
    options: { bpm: number; lookAhead?: number; updateInterval?: number },
  ) {
    this.bpm = Math.max(1, options.bpm);
    this.lookAhead = Math.max(0, options.lookAhead ?? 0.1);
    this.updateInterval = Math.max(0.001, options.updateInterval ?? 0.05);
  }

  private queryLoop(start: number, end: number): Synth8Event[] {
    // The compiled pattern query already knows whether the song is looped.
    // Repeating here made every live playback loop, including ordinary songs,
    // and also scheduled audio beyond the editor's Stop/Pause controls.
    return this.pattern.query(start, end);
  }

  getPosition(): number {
    if (!this.running) return this.pausedPosition;
    return Math.max(0, (this.clock.currentTime - this.origin) * this.bpm / 60);
  }

  private tick(): void {
    const musicalNow = this.getPosition();
    const end = Math.max(this.scheduledUntil, musicalNow + this.lookAhead * this.bpm / 60);
    if (end <= this.scheduledUntil) return;
    this.backend.schedule(this.queryLoop(this.scheduledUntil, end));
    this.scheduledUntil = end;
  }

  start(): void {
    if (this.running) return;
    if (this.scheduledUntil === 0) {
      this.origin = this.clock.currentTime;
      this.backend.start?.();
    } else if (this.pausedPosition > 0) {
      this.origin = this.clock.currentTime - this.pausedPosition * 60 / this.bpm;
      this.scheduledUntil = this.pausedPosition;
      this.backend.start?.();
    }
    this.running = true;
    this.tick();
    this.timer = setInterval(() => this.tick(), this.updateInterval * 1000);
  }

  pause(): void {
    this.pausedPosition = this.getPosition();
    this.running = false;
    if (this.timer !== undefined) clearInterval(this.timer);
    this.timer = undefined;
  }

  resume(): void { this.start(); }

  stop(): void {
    this.pause();
    this.scheduledUntil = 0;
    this.pausedPosition = 0;
    this.backend.stop?.();
  }
}
