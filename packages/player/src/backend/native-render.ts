import type { Pattern, Synth8Event } from "@vibuca/synth8-core";
import { WebAudioBackend } from "./web-audio";

/** Options for native OfflineAudioContext rendering. */
export type NativeRenderOptions = {
  bpm?: number;
  channels?: number;
  sampleRate?: number;
  /** Additional seconds retained after the pattern for release/effect tails. */
  tail?: number;
  /** Uses the same calibration as live native playback by default. */
  masterGain?: number;
};

const DEFAULT_BPM = 120;
const DEFAULT_CHANNELS = 2;

const offlineContext = (
  channels: number,
  length: number,
  sampleRate: number,
): OfflineAudioContext => {
  if (typeof OfflineAudioContext === "undefined") {
    throw new Error("This environment does not provide OfflineAudioContext.");
  }
  return new OfflineAudioContext(channels, length, sampleRate);
};

/**
 * Render a compiled pattern with the native backend. This is the first stage
 * of the Tone.js removal: it deliberately uses the same Synth8 event contract
 * as live playback and does not depend on Tone or Transport.
 */
export const renderNative = async (
  pattern: Pattern,
  options: NativeRenderOptions = {},
): Promise<AudioBuffer> => {
  const bpm = options.bpm ?? DEFAULT_BPM;
  const channels = Math.max(1, Math.floor(options.channels ?? DEFAULT_CHANNELS));
  const sampleRate = options.sampleRate ?? 44100;
  const tail = Math.max(0, options.tail ?? 0.25);
  const duration = Math.max(0, pattern.length * 60 / bpm);
  const context = offlineContext(channels, Math.max(1, Math.ceil((duration + tail) * sampleRate)), sampleRate);
  const backend = new WebAudioBackend({
    context,
    bpm,
    maxVoices: 32,
    masterGain: options.masterGain,
  });
  const events: Synth8Event[] = pattern.query(0, pattern.length);

  backend.start();
  backend.schedule(events);
  const buffer = await context.startRendering();
  backend.dispose();
  return buffer;
};

/** Render only a time window, with event times rebased to the window start. */
export const renderNativeChunk = async (
  pattern: Pattern,
  start: number,
  duration: number,
  options: NativeRenderOptions = {},
): Promise<AudioBuffer> => {
  const bpm = options.bpm ?? DEFAULT_BPM;
  const secondsPerBeat = 60 / bpm;
  const startBeat = Math.max(0, start / secondsPerBeat);
  const endBeat = Math.min(pattern.length, (start + Math.max(0, duration)) / secondsPerBeat);
  const events = pattern.query(startBeat, endBeat).map((event) => ({
    ...event,
    time: event.time - startBeat,
  }));
  const chunk: Pattern = {
    ...pattern,
    length: Math.max(0, endBeat - startBeat),
    query: (_from, _to) => events,
  };
  return renderNative(chunk, { ...options, tail: options.tail ?? 0.25 });
};
