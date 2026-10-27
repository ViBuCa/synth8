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
  channelVoices: Array<SampleVoice | undefined>,
  channelGains: number[],
  output?: AudioNode,
): ScheduledRow => {
  const pattern = module.patterns.find((candidate) => candidate.index === position.pattern);
  const row = pattern?.rows[position.row];
  if (!row) return { voices: [], effects: [] };
  const voices: SampleVoice[] = [];
  const effects: TrackerEffect[] = [];
  row.cells.forEach((cell, channel) => {
    if (cell.volume !== undefined) channelGains[channel] = Math.max(0, Math.min(1, cell.volume));
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
    const asset = channelSamples[channel];
    const existing = channelVoices[channel];
    if (cell.volume !== undefined && existing) {
      existing.gain.gain.cancelScheduledValues(when);
      existing.gain.gain.setValueAtTime(existing.gain.gain.value, when);
      existing.gain.gain.linearRampToValueAtTime(
        Math.max(0.0001, channelGains[channel] * (asset?.volume ?? 1)),
        when + Math.min(duration, tickDuration),
      );
    }
    if (cell.note === undefined) {
      if (!existing || !activeEffect) return;
      if (activeEffect.type === "note-cut") {
        existing.stop(when + activeEffect.tick * tickDuration);
      } else if (activeEffect.type === "volume-slide") {
        const up = activeEffect.amount >> 4;
        const down = activeEffect.amount & 0x0f;
        const target = Math.max(0, Math.min(1, channelGains[channel] + (up - down) / 64));
        channelGains[channel] = target;
        existing.gain.gain.cancelScheduledValues(when);
        existing.gain.gain.setValueAtTime(existing.gain.gain.value, when);
        existing.gain.gain.linearRampToValueAtTime(Math.max(0.0001, target * (asset?.volume ?? 1)), when + duration);
      } else if (activeEffect.type === "pitch-slide-up" || activeEffect.type === "pitch-slide-down" || activeEffect.type === "arpeggio" || activeEffect.type === "vibrato") {
        schedulePitchEffect(
          existing,
          activeEffect,
          when,
          duration,
          tickDuration,
          existing.source.playbackRate.value,
        );
      }
      return;
    }
    if (!asset) return;
    const delay = activeEffect?.type === "note-delay" ? activeEffect.tick * tickDuration : 0;
    if (existing && activeEffect?.type === "portamento") {
      const targetRate = samplePlaybackRate(asset, cell.note);
      const start = when + delay;
      existing.source.playbackRate.cancelScheduledValues(start);
      existing.source.playbackRate.setValueAtTime(existing.source.playbackRate.value, start);
      existing.source.playbackRate.linearRampToValueAtTime(targetRate, start + duration);
      return;
    }
    existing?.stop(when);
    const cut = activeEffect?.type === "note-cut" ? activeEffect.tick * tickDuration : undefined;
    const sampleOffset = activeEffect?.type === "sample-offset"
      ? activeEffect.offset / asset.buffer.sampleRate
      : 0;
    const voice = scheduleSampleVoice(context, asset, {
      when: when + delay,
      note: cell.note,
      ...(cut === undefined ? {} : { duration: Math.max(0.01, Math.min(duration, cut)) }),
      offset: sampleOffset,
      gain: channelGains[channel] ?? 1,
      pan: module.channels && module.channels > 1 ? (channel / (module.channels - 1)) * 2 - 1 : 0,
      output,
    });
    schedulePitchEffect(
      voice,
      activeEffect,
      when + delay,
      duration,
      tickDuration,
      samplePlaybackRate(asset, cell.note),
    );
    if (activeEffect?.type === "volume-slide") {
      const up = activeEffect.amount >> 4;
      const down = activeEffect.amount & 0x0f;
      const delta = (up - down) / 64;
      const target = Math.max(0, Math.min(1, (channelGains[channel] ?? 1) + delta));
      channelGains[channel] = target;
      voice.gain.gain.linearRampToValueAtTime(Math.max(0.0001, target * (asset.volume ?? 1)), when + delay + duration);
    }
    channelVoices[channel] = voice;
    voice.source.addEventListener("ended", () => {
      if (channelVoices[channel] === voice) channelVoices[channel] = undefined;
    }, { once: true });
    voices.push(voice);
  });
  return { voices, effects };
};

const lastEffect = <T extends TrackerEffect["type"]>(effects: readonly TrackerEffect[], type: T): Extract<TrackerEffect, { type: T }> | undefined => {
  for (let index = effects.length - 1; index >= 0; index -= 1) {
    const effect = effects[index];
    if (effect?.type === type) return effect as Extract<TrackerEffect, { type: T }>;
  }
  return undefined;
};

const applyRowControls = (clock: TrackerClock, effects: readonly TrackerEffect[]): void => {
  const speed = lastEffect(effects, "set-speed");
  const tempo = lastEffect(effects, "set-tempo");
  if (speed && speed.speed > 0) clock.setSpeed(speed.speed);
  if (tempo) clock.setTempo(tempo.bpm);
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
  const voices = new Set<SampleVoice>();
  const channelSamples: Array<SampleAsset | undefined> = [];
  const channelVoices: Array<SampleVoice | undefined> = [];
  const channelGains: number[] = [];
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
    // There is no meaningful clock progression for an empty module. Avoid
    // keeping a timer alive while repeatedly scheduling silent rows.
    if (!running || paused || module.orders.length === 0) return;
    const now = options.context.currentTime;
    if (scheduledUntil < now) scheduledUntil = now;
    while (scheduledUntil < now + lookAhead) {
      const position = clock.current;
      const rowDuration = clock.tickDuration * clock.speed;
      const row = scheduleRow(options.context, module, bank, position, scheduledUntil, rowDuration, clock.tickDuration, channelSamples, effectMemory, channelVoices, channelGains, options.output);
      for (const voice of row.voices) {
        voices.add(voice);
        voice.source.addEventListener("ended", () => voices.delete(voice), { once: true });
      }
      const rowSpeed = clock.speed;
      scheduledUntil += rowDuration;
      for (let tick = 0; tick < rowSpeed; tick += 1) clock.advance();
      applyRowControls(clock, row.effects);
      const jump = lastEffect(row.effects, "pattern-jump");
      const breakEffect = lastEffect(row.effects, "pattern-break");
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
    for (const voice of voices) voice.dispose();
    voices.clear();
    channelSamples.fill(undefined);
    channelVoices.fill(undefined);
    channelGains.fill(1);
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
      for (const voice of voices) voice.stop();
      voices.clear();
      // Scheduled voices are no longer valid after a pause. Keeping these
      // references would let later row effects automate already-stopped
      // sources when playback resumes.
      channelVoices.fill(undefined);
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
