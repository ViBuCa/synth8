import type { TrackerEffect, TrackerModule } from "./tracker-model";
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

type ScheduledRow = { voices: SampleVoice[]; effects: TrackerEffect[] };

const scheduleRow = (
  context: AudioContext,
  module: TrackerModule,
  bank: SampleBank,
  position: TrackerPosition,
  when: number,
  duration: number,
  tickDuration: number,
  output?: AudioNode,
): ScheduledRow => {
  const pattern = module.patterns.find((candidate) => candidate.index === position.pattern);
  const row = pattern?.rows[position.row];
  if (!row) return { voices: [], effects: [] };
  const voices: SampleVoice[] = [];
  const effects: TrackerEffect[] = [];
  row.cells.forEach((cell, channel) => {
    if (cell.effect) effects.push(cell.effect);
    if (cell.note === undefined || cell.instrument === undefined) return;
    const sample = module.samples.find((candidate) => candidate.index === cell.instrument);
    const asset = sample ? bank.get(sample.assetId) : undefined;
    if (!asset) return;
    const delay = cell.effect?.type === "note-delay" ? cell.effect.tick * tickDuration : 0;
    const cut = cell.effect?.type === "note-cut" ? cell.effect.tick * tickDuration : duration;
    const noteDuration = Math.max(0.01, Math.min(duration, cut));
    const sampleOffset = cell.effect?.type === "sample-offset"
      ? cell.effect.offset / asset.buffer.sampleRate
      : 0;
    voices.push(scheduleSampleVoice(context, asset, {
      when: when + delay,
      note: cell.note,
      duration: noteDuration,
      offset: sampleOffset,
      gain: cell.volume ?? 1,
      pan: module.channels && module.channels > 1 ? (channel / (module.channels - 1)) * 2 - 1 : 0,
      output,
    }));
  });
  return { voices, effects };
};

const applyRowControls = (clock: TrackerClock, effects: readonly TrackerEffect[]): void => {
  const speed = effects.find((effect) => effect.type === "set-speed");
  const tempo = effects.find((effect) => effect.type === "set-tempo");
  if (speed?.type === "set-speed" && speed.speed > 0) clock.setSpeed(speed.speed);
  if (tempo?.type === "set-tempo") clock.setTempo(tempo.bpm);
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
      const row = scheduleRow(options.context, module, bank, position, scheduledUntil, rowDuration, clock.tickDuration, options.output);
      voices.push(...row.voices);
      const rowSpeed = clock.speed;
      scheduledUntil += rowDuration;
      for (let tick = 0; tick < rowSpeed; tick += 1) clock.advance();
      applyRowControls(clock, row.effects);
      const jump = row.effects.find((effect) => effect.type === "pattern-jump");
      const breakEffect = row.effects.find((effect) => effect.type === "pattern-break");
      if (jump?.type === "pattern-jump") {
        clock.jump(jump.order, breakEffect?.type === "pattern-break" ? breakEffect.row : 0);
      } else if (breakEffect?.type === "pattern-break") {
        clock.jump(clock.current.order + 1, breakEffect.row);
      }
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
