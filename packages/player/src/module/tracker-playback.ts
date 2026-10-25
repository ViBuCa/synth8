import type { TrackerEffect, TrackerModule } from "./tracker-model";
import { TrackerClock, type TrackerPosition } from "./tracker-clock";
import { SampleBank, type SampleAsset, type SampleAssetData } from "./sample-bank";
import { samplePlaybackRate, scheduleSampleVoice, type SampleVoice } from "./sample-player";

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

/** Convert decoded module samples into portable Synth8 sample assets. */
export const sampleDataFromModule = (module: TrackerModule, sampleRate = 8363): SampleAssetData[] => module.samples
  .filter((sample) => sample.data?.length)
  .map((sample) => ({
    id: sample.assetId,
    name: sample.name,
    pcm: sample.data!,
    sampleRate,
    rootNote: sample.rootNote,
    volume: sample.volume,
    ...(sample.loopStart !== undefined && sample.loopEnd !== undefined
      ? { loop: { type: "forward" as const, start: sample.loopStart, end: sample.loopEnd } }
      : {}),
  }));

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

type EffectMemory = Array<TrackerEffect | undefined>;

const rememberedEffect = (effect: TrackerEffect, previous: TrackerEffect | undefined): TrackerEffect => {
  if (!previous || previous.type !== effect.type) return effect;
  if (effect.type === "pitch-slide-up" && previous.type === effect.type && effect.amount === 0) return previous;
  if (effect.type === "pitch-slide-down" && previous.type === effect.type && effect.amount === 0) return previous;
  if (effect.type === "portamento" && previous.type === effect.type && effect.amount === 0) return previous;
  if (effect.type === "sample-offset" && previous.type === effect.type && effect.offset === 0) return previous;
  if (effect.type === "volume-slide" && previous.type === effect.type && effect.amount === 0) return previous;
  if (effect.type === "vibrato" && previous.type === effect.type) {
    return {
      type: "vibrato",
      speed: effect.speed || previous.speed,
      depth: effect.depth || previous.depth,
    };
  }
  return effect;
};

const schedulePitchEffect = (
  voice: SampleVoice,
  effect: TrackerEffect | undefined,
  when: number,
  duration: number,
  tickDuration: number,
  baseRate: number,
): void => {
  if (!effect) return;
  const rate = voice.source.playbackRate;
  rate.cancelScheduledValues(when);
  rate.setValueAtTime(baseRate, when);
  if (effect.type === "pitch-slide-up" || effect.type === "pitch-slide-down") {
    // MOD slide units are period deltas, not semitones. This bounded
    // approximation keeps the direction and musical scale without pretending
    // that a one-row event is a persistent channel effect yet.
    const semitones = effect.amount / 8 * (effect.type === "pitch-slide-up" ? 1 : -1);
    rate.linearRampToValueAtTime(baseRate * 2 ** (semitones / 12), when + duration);
  } else if (effect.type === "arpeggio") {
    const values = [0, effect.x, effect.y, 0];
    values.forEach((semitones, index) => {
      const time = when + Math.min(duration, index * tickDuration);
      rate.setValueAtTime(baseRate * 2 ** (semitones / 12), time);
    });
  } else if (effect.type === "vibrato") {
    const ticks = Math.max(1, Math.ceil(duration / tickDuration));
    for (let tick = 0; tick <= ticks; tick += 1) {
      const time = when + Math.min(duration, tick * tickDuration);
      const phase = tick * effect.speed * Math.PI / 8;
      const semitones = Math.sin(phase) * effect.depth / 2;
      rate.setValueAtTime(baseRate * 2 ** (semitones / 12), time);
    }
  }
};

const scheduleRow = (
  context: AudioContext,
  module: TrackerModule,
  bank: SampleBank,
  position: TrackerPosition,
  when: number,
  duration: number,
  tickDuration: number,
  channelSamples: Array<SampleAsset | undefined>,
  effectMemory: EffectMemory,
  output?: AudioNode,
): ScheduledRow => {
  const pattern = module.patterns.find((candidate) => candidate.index === position.pattern);
  const row = pattern?.rows[position.row];
  if (!row) return { voices: [], effects: [] };
  const voices: SampleVoice[] = [];
  const effects: TrackerEffect[] = [];
  row.cells.forEach((cell, channel) => {
    const activeEffect = cell.effect
      ? rememberedEffect(cell.effect, effectMemory[channel])
      : undefined;
    if (cell.effect && activeEffect) {
      effectMemory[channel] = activeEffect;
      effects.push(activeEffect);
    }
    if (cell.instrument !== undefined) {
      const selected = module.samples.find((candidate) => candidate.index === cell.instrument);
      channelSamples[channel] = selected ? bank.get(selected.assetId) : undefined;
    }
    if (cell.note === undefined) return;
    const asset = channelSamples[channel];
    if (!asset) return;
    const delay = activeEffect?.type === "note-delay" ? activeEffect.tick * tickDuration : 0;
    const cut = activeEffect?.type === "note-cut" ? activeEffect.tick * tickDuration : duration;
    const noteDuration = Math.max(0.01, Math.min(duration, cut));
    const sampleOffset = activeEffect?.type === "sample-offset"
      ? activeEffect.offset / asset.buffer.sampleRate
      : 0;
    const voice = scheduleSampleVoice(context, asset, {
      when: when + delay,
      note: cell.note,
      duration: noteDuration,
      offset: sampleOffset,
      gain: cell.volume ?? 1,
      pan: module.channels && module.channels > 1 ? (channel / (module.channels - 1)) * 2 - 1 : 0,
      output,
    });
    schedulePitchEffect(
      voice,
      activeEffect,
      when + delay,
      noteDuration,
      tickDuration,
      samplePlaybackRate(asset, cell.note),
    );
    if (activeEffect?.type === "volume-slide") {
      const up = activeEffect.amount >> 4;
      const down = activeEffect.amount & 0x0f;
      const delta = (up - down) / 64;
      const target = Math.max(0.001, Math.min(1, (cell.volume ?? 1) + delta));
      voice.gain.gain.linearRampToValueAtTime(target, when + delay + noteDuration);
    }
    voices.push(voice);
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
 * clock while preserving the module's order/row/tick timing. A small amount
 * of per-channel effect parameter memory is retained for tracker commands
 * that omit a parameter on subsequent rows.
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
  const channelSamples: Array<SampleAsset | undefined> = [];
  const effectMemory: EffectMemory = [];
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
      const row = scheduleRow(options.context, module, bank, position, scheduledUntil, rowDuration, clock.tickDuration, channelSamples, effectMemory, options.output);
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
    channelSamples.fill(undefined);
    effectMemory.fill(undefined);
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
