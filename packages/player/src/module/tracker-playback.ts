import type { TrackerModule } from "./tracker-model";
import { TrackerClock, type TrackerPosition } from "./tracker-clock";
import { SampleBank } from "./sample-bank";
import { scheduleSampleVoice, type SampleVoice } from "./sample-player";

export type TrackerPlaybackOptions = {
  context: AudioContext;
  output?: AudioNode;
  lookAhead?: number;
  updateInterval?: number;
  sampleRate?: number;
};

export type TrackerPlayback = {
  start(): void;
  pause(): void;
  resume(): void;
  stop(): void;
  dispose(): void;
  getPosition(): TrackerPosition;
};

const patternRows = (module: TrackerModule): ReadonlyMap<number, number> =>
  new Map(module.patterns.map((pattern) => [pattern.index, pattern.rows.length]));

/** Convert decoded MOD-style PCM into a preloaded sample bank. */
export const sampleBankFromModule = (
  context: BaseAudioContext,
  module: TrackerModule,
  sampleRate = 8363,
): SampleBank => {
  const bank = new SampleBank(context);
  for (const sample of module.samples) {
    if (!sample.data?.length) continue;
    bank.addPcm(sample.assetId, sample.data, {
      sampleRate,
      rootNote: sample.rootNote,
      volume: sample.volume,
      ...(sample.loopStart !== undefined && sample.loopEnd !== undefined
        ? { loop: { type: "forward" as const, start: sample.loopStart, end: sample.loopEnd } }
        : {}),
    });
  }
  return bank;
};

const scheduleRow = (
  context: AudioContext,
  module: TrackerModule,
  bank: SampleBank,
  position: TrackerPosition,
  when: number,
  duration: number,
  output?: AudioNode,
): SampleVoice[] => {
  const pattern = module.patterns.find((candidate) => candidate.index === position.pattern);
  const row = pattern?.rows[position.row];
  if (!row) return [];
  const voices: SampleVoice[] = [];
  row.cells.forEach((cell, channel) => {
    if (cell.note === undefined || cell.instrument === undefined) return;
    const sample = module.samples.find((candidate) => candidate.index === cell.instrument);
    const asset = sample ? bank.get(sample.assetId) : undefined;
    if (!asset) return;
    voices.push(scheduleSampleVoice(context, asset, {
      when,
      note: cell.note,
      duration,
      gain: cell.volume ?? 1,
      pan: module.channels && module.channels > 1 ? (channel / (module.channels - 1)) * 2 - 1 : 0,
      output,
    }));
  });
  return voices;
};

/**
 * Minimal live tracker player. It schedules row note-ons ahead of the audio
 * clock while preserving the module's order/row/tick timing. Tracker effects
 * are decoded already, but effect execution is intentionally the next layer.
 */
export const createTrackerPlayback = (
  module: TrackerModule,
  options: TrackerPlaybackOptions,
): TrackerPlayback => {
  const clock = new TrackerClock({
    orders: module.orders,
    patternRows: patternRows(module),
    speed: module.initialSpeed,
    tempo: module.initialTempo,
    restartOrder: module.restartOrder,
  });
  const bank = sampleBankFromModule(options.context, module, options.sampleRate);
  const lookAhead = Math.max(0.05, options.lookAhead ?? 0.2);
  const updateInterval = Math.max(10, options.updateInterval ?? 25);
  const voices: SampleVoice[] = [];
  let timer: ReturnType<typeof setTimeout> | undefined;
  let scheduledUntil = 0;
  let running = false;
  let paused = false;

  const clearTimer = (): void => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  };
  const schedule = (): void => {
    if (!running || paused) return;
    const now = options.context.currentTime;
    if (scheduledUntil < now) scheduledUntil = now;
    while (scheduledUntil < now + lookAhead) {
      const position = clock.current;
      const rowDuration = clock.tickDuration * clock.speed;
      voices.push(...scheduleRow(options.context, module, bank, position, scheduledUntil, rowDuration, options.output));
      scheduledUntil += rowDuration;
      for (let tick = 0; tick < clock.speed; tick += 1) clock.advance();
    }
    timer = setTimeout(schedule, updateInterval);
  };
  const reset = (): void => {
    clearTimer();
    for (const voice of voices.splice(0)) voice.dispose();
    clock.reset();
    scheduledUntil = 0;
  };

  return {
    start() {
      if (running && !paused) return;
      void options.context.resume();
      running = true;
      paused = false;
      schedule();
    },
    pause() {
      if (!running) return;
      paused = true;
      clearTimer();
      for (const voice of voices.splice(0)) voice.stop();
    },
    resume() {
      if (!running || !paused) return;
      paused = false;
      scheduledUntil = options.context.currentTime;
      schedule();
    },
    stop() {
      running = false;
      paused = false;
      reset();
    },
    dispose() {
      running = false;
      paused = false;
      reset();
      bank.clear();
    },
    getPosition() { return clock.current; },
  };
};
