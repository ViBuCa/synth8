import type { Pattern, PlaybackConfig, Synth8AudioBackend, Synth8Event } from "@vibuca/synth8-core";
import { WebAudioBackend } from "../backend/web-audio";
import type { SampleAssetData, SampleAsset } from "./sample-bank";
import { SampleBank } from "./sample-bank";
import { scheduleSampleVoice, type SampleVoice } from "./sample-player";

export type InstrumentSampleZone = {
  sampleId: string;
  rootNote: number;
  lowNote: number;
  highNote: number;
};

export type PackedInstrument = {
  id: string;
  name?: string;
  kind?: "note" | "drum";
  /** Original Synth8 playback description used to render this instrument. */
  playback?: PlaybackConfig;
  /** MIDI note range observed/exported for melodic instruments. */
  range?: { lowNote: number; highNote: number };
  /** Sample zones, tracker/sampler style. */
  zones?: InstrumentSampleZone[];
  /** Drum sample map for percussive layers. */
  drums?: Array<{ drum: string; sampleId: string }>;
};

export type InstrumentPackData = {
  version: 1;
  name?: string;
  createdBy: "synth8";
  sampleRate: number;
  instruments: PackedInstrument[];
  samples: SampleAssetData[];
};

export type SerializedInstrumentPack = Omit<InstrumentPackData, "samples"> & {
  samples: Array<Omit<SampleAssetData, "pcm"> & { pcm: string }>;
};

export type RenderInstrumentPackOptions = {
  name?: string;
  sampleRate?: number;
  /** Seconds to hold each note before release. */
  noteDuration?: number;
  /** Extra seconds retained for release/effect tails. */
  tail?: number;
  /** Render every N semitones across the used range. Defaults to exact used notes. */
  intervalSemitones?: number;
  /** Optional extra semitones below and above the used note range. */
  rangePadding?: number;
  masterGain?: number;
  sampleBank?: SampleBank;
};

const toBase64 = (data: Int8Array): string => {
  let binary = "";
  const bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, Math.min(bytes.length, offset + 0x8000)));
  }
  return btoa(binary);
};

const fromBase64 = (value: string): Int8Array => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Int8Array(bytes.buffer);
};

export const encodeInstrumentPack = (pack: InstrumentPackData): string => JSON.stringify({
  ...pack,
  samples: pack.samples.map((sample) => ({ ...sample, pcm: toBase64(sample.pcm) })),
} satisfies SerializedInstrumentPack);

export const decodeInstrumentPack = (source: string): InstrumentPackData => {
  const parsed = JSON.parse(source) as Partial<SerializedInstrumentPack>;
  if (parsed.version !== 1 || parsed.createdBy !== "synth8" || !Array.isArray(parsed.instruments) || !Array.isArray(parsed.samples)) {
    throw new Error("Unsupported Synth8 instrument pack format.");
  }
  return {
    version: 1,
    name: parsed.name,
    createdBy: "synth8",
    sampleRate: Number(parsed.sampleRate) || 22050,
    instruments: parsed.instruments.map((instrument) => {
      if (!instrument || typeof instrument.id !== "string") {
        throw new Error("Invalid Synth8 instrument pack instrument.");
      }
      return instrument as PackedInstrument;
    }),
    samples: parsed.samples.map((sample) => {
      if (!sample || typeof sample.id !== "string" || typeof sample.pcm !== "string" || typeof sample.sampleRate !== "number") {
        throw new Error("Invalid Synth8 instrument pack sample.");
      }
      return {
        id: sample.id,
        name: sample.name,
        pcm: fromBase64(sample.pcm),
        sampleRate: sample.sampleRate,
        rootNote: sample.rootNote,
        finetune: sample.finetune,
        volume: sample.volume,
        loop: sample.loop,
      };
    }),
  };
};

export const addInstrumentPackToSampleBank = (
  bank: SampleBank,
  pack: InstrumentPackData,
): ReturnType<SampleBank["addAll"]> => bank.addAll(pack.samples);

const playbackKey = (playback?: PlaybackConfig): string => JSON.stringify(playback ?? {});

const instrumentGroupKey = (playback?: PlaybackConfig): string => playback?.instrument
  ? `instrument:${playback.instrument}`
  : playbackKey(playback);

const playbackName = (playback?: PlaybackConfig): string => {
  if (playback?.instrument) return playback.instrument;
  if (playback?.preset) return playback.preset;
  if (playback?.sample) return `sample-${playback.sample}`;
  if (playback?.oscillators?.length) return playback.oscillators.map((oscillator) => oscillator.sound).join("+");
  if (playback?.sound) return playback.sound;
  return "default";
};

const pitchToMidi = (pitch: string): number => {
  const match = /^([a-gA-G])([#b]?)(-?\d+)$/.exec(pitch.trim());
  if (!match) return 60;
  const semitones: Record<string, number> = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
  const accidental = match[2] === "#" ? 1 : match[2] === "b" ? -1 : 0;
  return (Number(match[3]) + 1) * 12 + semitones[match[1].toLowerCase()] + accidental;
};

const NOTE_NAMES = ["c", "c#", "d", "d#", "e", "f", "f#", "g", "g#", "a", "a#", "b"];

const midiToPitch = (midi: number): string => `${NOTE_NAMES[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;

const audioBufferToMonoPcm = (buffer: AudioBuffer): Int8Array => {
  const pcm = new Int8Array(buffer.length);
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, channel) => buffer.getChannelData(channel));
  for (let sample = 0; sample < buffer.length; sample += 1) {
    let value = 0;
    for (const channel of channels) value += channel[sample] ?? 0;
    value /= Math.max(1, channels.length);
    pcm[sample] = Math.max(-128, Math.min(127, Math.round(value * 127)));
  }
  return pcm;
};

const offlineContext = (length: number, sampleRate: number): OfflineAudioContext => {
  if (typeof OfflineAudioContext === "undefined") throw new Error("This environment does not provide OfflineAudioContext.");
  return new OfflineAudioContext(1, length, sampleRate);
};

const renderInstrumentEvent = async (
  playback: PlaybackConfig | undefined,
  event: Synth8Event,
  options: Required<Pick<RenderInstrumentPackOptions, "sampleRate" | "noteDuration" | "tail">> & Pick<RenderInstrumentPackOptions, "masterGain" | "sampleBank">,
): Promise<Int8Array> => {
  const length = Math.max(1, Math.ceil((options.noteDuration + options.tail) * options.sampleRate));
  const context = offlineContext(length, options.sampleRate);
  const backend = new WebAudioBackend({
    context,
    bpm: 60,
    maxVoices: 1,
    masterGain: options.masterGain ?? 0.9,
    sampleBank: options.sampleBank,
  });
  backend.start();
  backend.schedule([{ ...event, ...(playback && Object.keys(playback).length > 0 ? { parameters: { ...playback } } : {}) }]);
  const buffer = await context.startRendering();
  backend.dispose();
  return audioBufferToMonoPcm(buffer);
};

const renderInstrumentNote = (
  playback: PlaybackConfig | undefined,
  midi: number,
  options: Required<Pick<RenderInstrumentPackOptions, "sampleRate" | "noteDuration" | "tail">> & Pick<RenderInstrumentPackOptions, "masterGain" | "sampleBank">,
): Promise<Int8Array> => renderInstrumentEvent(playback, {
  kind: "note",
  time: 0,
  duration: options.noteDuration,
  pitch: midiToPitch(midi),
  velocity: 1,
}, options);

const renderInstrumentDrum = (
  playback: PlaybackConfig | undefined,
  drum: string,
  options: Required<Pick<RenderInstrumentPackOptions, "sampleRate" | "noteDuration" | "tail">> & Pick<RenderInstrumentPackOptions, "masterGain" | "sampleBank">,
): Promise<Int8Array> => renderInstrumentEvent(playback, {
  kind: "drum",
  time: 0,
  duration: Math.min(1, options.noteDuration),
  drum,
  velocity: 1,
}, options);

const sampleRootsFor = (notes: readonly number[], intervalSemitones?: number, padding = 0): number[] => {
  const unique = [...new Set(notes)].sort((a, b) => a - b);
  if (!unique.length) return [];
  if (!intervalSemitones || intervalSemitones <= 1) return unique;
  const low = Math.max(0, unique[0] - Math.max(0, Math.floor(padding)));
  const high = Math.min(127, unique[unique.length - 1] + Math.max(0, Math.floor(padding)));
  const roots: number[] = [];
  for (let note = low; note <= high; note += Math.max(1, Math.floor(intervalSemitones))) roots.push(note);
  if (!roots.includes(high)) roots.push(high);
  return roots;
};

const zonesFor = (instrumentId: string, roots: readonly number[]): InstrumentSampleZone[] => roots.map((root, index) => {
  const previous = roots[index - 1];
  const next = roots[index + 1];
  const lowNote = previous === undefined ? 0 : Math.floor((previous + root) / 2) + 1;
  const highNote = next === undefined ? 127 : Math.floor((root + next) / 2);
  return { sampleId: `${instrumentId}-n${root}`, rootNote: root, lowNote, highNote };
});

/**
 * Render Synth8 melodic layer instruments into a tracker/sampler-like pack.
 * The pack contains instrument descriptions plus all generated PCM samples, so
 * it can be imported into a SampleBank or inspected/reused in the laboratory.
 */
const instrumentNamed = (instrument: PackedInstrument, name: string): boolean =>
  instrument.name === name || instrument.id === name || instrument.playback?.instrument === name;

const findNoteInstrument = (pack: InstrumentPackData, playback?: PlaybackConfig, explicitName?: string): PackedInstrument | undefined => {
  if (explicitName) return pack.instruments.find((instrument) => (instrument.kind ?? "note") === "note" && instrumentNamed(instrument, explicitName));
  if (playback?.instrument) {
    const named = pack.instruments.find((instrument) => (instrument.kind ?? "note") === "note" && instrumentNamed(instrument, playback.instrument!));
    if (named) return named;
  }
  const key = playbackKey(playback);
  return pack.instruments.find((instrument) => (instrument.kind ?? "note") === "note" && playbackKey(instrument.playback) === key);
};

const findDrumInstrument = (pack: InstrumentPackData, playback?: PlaybackConfig, explicitName?: string): PackedInstrument | undefined => {
  if (explicitName) return pack.instruments.find((instrument) => instrument.kind === "drum" && instrumentNamed(instrument, explicitName));
  if (playback?.instrument) {
    const named = pack.instruments.find((instrument) => instrument.kind === "drum" && instrumentNamed(instrument, playback.instrument!));
    if (named) return named;
  }
  const key = playbackKey(playback);
  return pack.instruments.find((instrument) => instrument.kind === "drum" && playbackKey(instrument.playback) === key);
};

export const findInstrumentSampleForNote = (
  pack: InstrumentPackData,
  instrument: PackedInstrument,
  midi: number,
): SampleAssetData | undefined => {
  const zones = instrument.zones ?? [];
  const zone = zones.find((item) => midi >= item.lowNote && midi <= item.highNote)
    ?? zones.reduce<InstrumentSampleZone | undefined>((closest, item) => {
      if (!closest) return item;
      return Math.abs(item.rootNote - midi) < Math.abs(closest.rootNote - midi) ? item : closest;
    }, undefined);
  return zone ? pack.samples.find((sample) => sample.id === zone.sampleId) : undefined;
};

export type InstrumentPackBackendOptions = {
  context: BaseAudioContext;
  pack: InstrumentPackData;
  sampleBank: SampleBank;
  bpm?: number;
  output?: AudioNode;
  masterGain?: number;
  /** Map requested instrument names to replacement names, or false to mute. */
  instrumentOverrides?: Record<string, string | false | undefined>;
};

/** Minimal sampler backend for packs exported by renderInstrumentPack(). */
export class InstrumentPackBackend implements Synth8AudioBackend {
  private readonly context: BaseAudioContext;
  private readonly pack: InstrumentPackData;
  private readonly sampleBank: SampleBank;
  private readonly output: AudioNode;
  private readonly outputGain: GainNode;
  private bpm: number;
  private readonly overrides = new Map<string, string | false>();
  private readonly voices: SampleVoice[] = [];
  private origin = 0;
  private running = false;

  constructor(options: InstrumentPackBackendOptions) {
    this.context = options.context;
    this.pack = options.pack;
    this.sampleBank = options.sampleBank;
    this.bpm = options.bpm ?? 120;
    this.outputGain = options.context.createGain();
    this.outputGain.gain.value = Math.max(0, Math.min(1, options.masterGain ?? 0.9));
    this.outputGain.connect(options.output ?? options.context.destination);
    this.output = this.outputGain;
    for (const [source, target] of Object.entries(options.instrumentOverrides ?? {})) {
      if (target !== undefined) this.overrides.set(source, target);
    }
  }

  start(): void {
    this.origin = this.context.currentTime;
    this.running = true;
    if ("resume" in this.context) void (this.context as AudioContext).resume();
  }

  schedule(events: readonly Synth8Event[]): void {
    if (!this.running) this.start();
    for (const event of events) {
      const playback = (event.parameters ?? {}) as PlaybackConfig;
      const requestedInstrument = playback.instrument;
      const override = requestedInstrument ? this.overrides.get(requestedInstrument) : undefined;
      if (override === false) continue;
      const when = this.origin + event.time * (60 / this.bpm);
      if (event.kind === "note") {
        const instrument = findNoteInstrument(this.pack, playback, override);
        if (!instrument) continue;
        const midi = pitchToMidi(event.pitch);
        const sample = findInstrumentSampleForNote(this.pack, instrument, midi);
        const asset = sample ? this.sampleBank.get(sample.id) : undefined;
        if (asset) this.scheduleAsset(asset, midi, event, when, playback);
      } else {
        const instrument = findDrumInstrument(this.pack, playback, override);
        const sampleId = instrument?.drums?.find((item) => item.drum === event.drum)?.sampleId;
        const asset = sampleId ? this.sampleBank.get(sampleId) : undefined;
        if (asset) this.scheduleAsset(asset, asset.rootNote ?? 60, event, when, playback);
      }
    }
  }

  private scheduleAsset(asset: SampleAsset, note: number, event: Synth8Event, when: number, playback: PlaybackConfig): void {
    const duration = Math.max(0.005, event.duration * (60 / this.bpm));
    this.voices.push(scheduleSampleVoice(this.context, asset, {
      when,
      note,
      duration,
      gain: Math.max(0, Math.min(1, (event.velocity ?? 0.8) * (event.controls?.gain ?? 1) * (playback.gain ?? 1))),
      pan: event.controls?.pan ?? playback.pan ?? 0,
      attack: playback.envelope?.attack,
      release: playback.envelope?.release,
      output: this.output,
    }));
  }

  stop(): void {
    this.running = false;
    for (const voice of this.voices.splice(0)) voice.stop();
  }

  setMasterGain(gain: number): void {
    this.outputGain.gain.setTargetAtTime(Math.max(0, Math.min(1, gain)), this.context.currentTime, 0.01);
  }

  setBpm(bpm: number): void {
    const next = Math.max(1, bpm);
    const beat = Math.max(0, (this.context.currentTime - this.origin) * this.bpm / 60);
    this.bpm = next;
    this.origin = this.context.currentTime - beat * 60 / this.bpm;
  }

  setInstrumentOverride(source: string, target: string | false | undefined): void {
    if (target === undefined) this.overrides.delete(source);
    else this.overrides.set(source, target);
  }

  dispose(): void {
    this.stop();
    this.outputGain.disconnect();
  }
}

export const renderInstrumentPack = async (
  pattern: Pattern,
  options: RenderInstrumentPackOptions = {},
): Promise<InstrumentPackData> => {
  const sampleRate = Math.max(4000, Math.floor(options.sampleRate ?? 22050));
  const noteDuration = Math.max(0.05, options.noteDuration ?? 1);
  const tail = Math.max(0, options.tail ?? 0.25);
  const noteGroups = new Map<string, { playback?: PlaybackConfig; notes: number[] }>();
  const drumGroups = new Map<string, { playback?: PlaybackConfig; drums: string[] }>();

  for (const layer of pattern.layers ?? []) {
    const notes = layer.events.filter((event) => event.type === "note").map((event) => pitchToMidi(event.value));
    const drums = layer.events.filter((event) => event.type === "drum").map((event) => event.value);
    const key = instrumentGroupKey(layer.playback);
    if (notes.length) {
      const group = noteGroups.get(key) ?? { playback: layer.playback, notes: [] };
      group.notes.push(...notes);
      noteGroups.set(key, group);
    }
    if (drums.length) {
      const group = drumGroups.get(key) ?? { playback: layer.playback, drums: [] };
      group.drums.push(...drums);
      drumGroups.set(key, group);
    }
  }

  const instruments: PackedInstrument[] = [];
  const samples: SampleAssetData[] = [];
  let index = 0;
  for (const group of noteGroups.values()) {
    index += 1;
    const instrumentId = `inst-${index}-${playbackName(group.playback).replace(/[^a-z0-9_-]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "default"}`;
    const roots = sampleRootsFor(group.notes, options.intervalSemitones, options.rangePadding);
    if (!roots.length) continue;
    const zones = zonesFor(instrumentId, roots);
    for (const root of roots) {
      const sampleId = `${instrumentId}-n${root}`;
      samples.push({
        id: sampleId,
        name: `${playbackName(group.playback)} ${midiToPitch(root)}`,
        pcm: await renderInstrumentNote(group.playback, root, { sampleRate, noteDuration, tail, masterGain: options.masterGain, sampleBank: options.sampleBank }),
        sampleRate,
        rootNote: root,
        volume: 1,
        loop: { type: "none" },
      });
    }
    const used = [...new Set(group.notes)].sort((a, b) => a - b);
    instruments.push({
      id: instrumentId,
      name: playbackName(group.playback),
      kind: "note",
      playback: group.playback,
      range: { lowNote: used[0], highNote: used[used.length - 1] },
      zones,
    });
  }

  for (const group of drumGroups.values()) {
    index += 1;
    const instrumentId = `inst-${index}-${playbackName(group.playback).replace(/[^a-z0-9_-]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "drums"}-drums`;
    const drums = [...new Set(group.drums)].sort();
    const drumSamples: Array<{ drum: string; sampleId: string }> = [];
    for (const drum of drums) {
      const sampleId = `${instrumentId}-${drum}`;
      drumSamples.push({ drum, sampleId });
      samples.push({
        id: sampleId,
        name: `${playbackName(group.playback)} ${drum}`,
        pcm: await renderInstrumentDrum(group.playback, drum, { sampleRate, noteDuration, tail, masterGain: options.masterGain, sampleBank: options.sampleBank }),
        sampleRate,
        rootNote: 60,
        volume: 1,
        loop: { type: "none" },
      });
    }
    instruments.push({
      id: instrumentId,
      name: `${playbackName(group.playback)} drums`,
      kind: "drum",
      playback: group.playback,
      drums: drumSamples,
    });
  }

  return {
    version: 1,
    name: options.name,
    createdBy: "synth8",
    sampleRate,
    instruments,
    samples,
  };
};
