import type { SampleAsset } from "./sample-bank";

export type SampleVoiceOptions = {
  /** Absolute AudioContext time. Defaults to context.currentTime. */
  when?: number;
  /** MIDI note number. The sample's rootNote defaults to 60. */
  note?: number;
  /** Additional cents of tuning. */
  finetune?: number;
  gain?: number;
  pan?: number;
  attack?: number;
  release?: number;
  duration?: number;
  offset?: number;
  output?: AudioNode;
  effects?: {
    lowpass?: number;
    highpass?: number;
    distortion?: number;
  };
};

export type SampleVoice = {
  source: AudioBufferSourceNode;
  gain: GainNode;
  stop: (when?: number) => void;
  dispose: () => void;
};

export const samplePlaybackRate = (
  asset: SampleAsset,
  note: number,
  finetune = 0,
): number => {
  const root = asset.rootNote ?? 60;
  const cents = (asset.finetune ?? 0) + finetune;
  return 2 ** ((note - root) / 12 + cents / 1200);
};

const midiRate = (asset: SampleAsset, options: SampleVoiceOptions): number =>
  samplePlaybackRate(asset, options.note ?? asset.rootNote ?? 60, options.finetune ?? 0);

/**
 * Schedule one preloaded sample without decoding or allocating audio data at
 * note time. This is intentionally independent of the tracker clock so MOD,
 * XM, TFMX and Synth8-native instruments can share the same voice primitive.
 */
export const scheduleSampleVoice = (
  context: BaseAudioContext,
  asset: SampleAsset,
  options: SampleVoiceOptions = {},
): SampleVoice => {
  const source = context.createBufferSource();
  const gain = context.createGain();
  const panner = context.createStereoPanner();
  const output = options.output ?? context.destination;
  const effects = options.effects ?? {};
  const when = Math.max(context.currentTime, options.when ?? context.currentTime);
  const offset = Math.max(0, Math.min(options.offset ?? 0, asset.buffer.duration));
  const attack = Math.max(0.001, options.attack ?? 0.002);
  const release = Math.max(0, options.release ?? 0.04);
  const requestedGain = Math.max(0, Math.min(1, (options.gain ?? 1) * (asset.volume ?? 1)));
  const loop = asset.loop;

  source.buffer = asset.buffer;
  source.playbackRate.setValueAtTime(midiRate(asset, options), when);
  if (loop && loop.type === "forward") {
    const start = Math.max(0, Math.min(loop.start / asset.buffer.sampleRate, asset.buffer.duration));
    const end = Math.max(start, Math.min(loop.end / asset.buffer.sampleRate, asset.buffer.duration));
    if (end > start) {
      source.loop = true;
      source.loopStart = start;
      source.loopEnd = end;
    }
  }
  panner.pan.setValueAtTime(Math.max(-1, Math.min(1, options.pan ?? 0)), when);
  gain.gain.setValueAtTime(0, when);
  gain.gain.linearRampToValueAtTime(requestedGain, when + attack);
  const filter = effects.lowpass !== undefined || effects.highpass !== undefined
    ? context.createBiquadFilter()
    : undefined;
  if (filter) {
    filter.type = effects.highpass !== undefined && effects.lowpass === undefined ? "highpass" : "lowpass";
    filter.frequency.setValueAtTime(effects.highpass ?? effects.lowpass ?? 20000, when);
  }
  const distortion = effects.distortion !== undefined ? context.createWaveShaper() : undefined;
  if (distortion) {
    const curve = new Float32Array(256);
    const drive = 1 + effects.distortion! * 40;
    for (let index = 0; index < curve.length; index += 1) {
      const x = (index * 2) / (curve.length - 1) - 1;
      curve[index] = Math.tanh(x * drive) * (1 - effects.distortion! * 0.3);
    }
    distortion.curve = curve;
  }
  const sourceChain = filter ? gain.connect(filter) : gain;
  const shaped = distortion ? sourceChain.connect(distortion) : sourceChain;
  shaped.connect(panner).connect(output);

  const duration = options.duration === undefined ? undefined : Math.max(0, options.duration);
  const end = duration === undefined ? undefined : when + duration;
  if (end !== undefined) {
    const releaseStart = Math.max(when + attack, end - release);
    gain.gain.setValueAtTime(requestedGain, releaseStart);
    gain.gain.linearRampToValueAtTime(0, end + release);
    source.start(when, offset);
    source.stop(end + release);
  } else {
    source.start(when, offset);
  }

  let disposed = false;
  const stop = (stopWhen = context.currentTime): void => {
    if (disposed) return;
    const time = Math.max(context.currentTime, stopWhen);
    gain.gain.cancelScheduledValues(time);
    gain.gain.setValueAtTime(Math.max(0.0001, requestedGain), time);
    gain.gain.linearRampToValueAtTime(0, time + release);
    try { source.stop(time + release); } catch { /* already stopped */ }
  };
  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    try { source.stop(); } catch { /* already stopped */ }
    source.disconnect();
    gain.disconnect();
    filter?.disconnect();
    distortion?.disconnect();
    panner.disconnect();
  };

  source.addEventListener("ended", () => {
    if (!disposed) {
      source.disconnect();
      gain.disconnect();
      panner.disconnect();
    }
  }, { once: true });

  return { source, gain, stop, dispose };
};
