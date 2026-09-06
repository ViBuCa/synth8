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
    const length = (this.pattern as { length?: number }).length;
    if (!length || length <= 0) return this.pattern.query(start, end);
    const events: Synth8Event[] = [];
    let cursor = start;
    while (cursor < end) {
      const cycle = Math.floor(cursor / length);
      const offset = cycle * length;
      const localStart = cursor - offset;
      const localEnd = Math.min(length, localStart + end - cursor);
      for (const event of this.pattern.query(localStart, localEnd)) {
        events.push({ ...event, time: event.time + offset });
      }
      cursor = offset + localEnd;
      if (cursor <= start) break;
    }
    return events;
  }

  private tick(): void {
    const musicalNow = Math.max(0, (this.clock.currentTime - this.origin) * this.bpm / 60);
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
}
