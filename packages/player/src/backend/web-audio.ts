import type { PlaybackConfig, Synth8AudioBackend, Synth8Event } from "@vibuca/synth8-core";
import { resolvePlaybackPreset } from "../playback/presets";

export type WebAudioBackendOptions = {
  context: AudioContext;
  bpm?: number;
  maxVoices?: number;
  output?: AudioNode;
};

export type WebAudioBackendStats = {
  voicesCreated: number;
  voicesReused: number;
  voicesStolen: number;
  eventsScheduled: number;
  activeVoices: number;
  maxActiveVoices: number;
};

type Voice = {
  oscillator: OscillatorNode;
  gain: GainNode;
  filter: BiquadFilterNode;
  panner: StereoPannerNode;
  delay?: DelayNode;
  delayGain?: GainNode;
  delayFeedback?: GainNode;
  chorusLfo?: OscillatorNode;
  chorusDepth?: GainNode;
  convolver?: ConvolverNode;
  reverbGain?: GainNode;
  distortion?: WaveShaperNode;
  vibrato?: OscillatorNode;
  vibratoGain?: GainNode;
  noise?: AudioBufferSourceNode;
  startedAt: number;
  endsAt: number;
  active: boolean;
};

const waveform = (instrument?: string): OscillatorType => {
  if (instrument === "triangle" || instrument === "square" || instrument === "sawtooth") return instrument;
  if (instrument?.startsWith("pulse") || instrument === "noise" || instrument === "wavetable") return "square";
  return "sine";
};

const eventPlayback = (event: Synth8Event): PlaybackConfig =>
  resolvePlaybackPreset((event.parameters ?? {}) as PlaybackConfig) ?? {};

const distortionCurve = (amount: number): Float32Array<ArrayBuffer> => {
  const curve: Float32Array<ArrayBuffer> = new Float32Array(new ArrayBuffer(256 * Float32Array.BYTES_PER_ELEMENT));
  const drive = 1 + amount * 40;
  for (let i = 0; i < curve.length; i++) {
    const x = (i * 2) / (curve.length - 1) - 1;
    curve[i] = Math.tanh(x * drive);
  }
  return curve;
};

const pitchToFrequency = (pitch: string): number => {
  const match = /^([a-gA-G])([#b]?)(-?\d+)$/.exec(pitch.trim());
  if (!match) return 440;
  const semitones: Record<string, number> = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
  const accidental = match[2] === "#" ? 1 : match[2] === "b" ? -1 : 0;
  const midi = (Number(match[3]) + 1) * 12 + semitones[match[1].toLowerCase()] + accidental;
  return 440 * 2 ** ((midi - 69) / 12);
};

/**
 * Small native WebAudio backend for Synth8. Voices own their graph for their
 * entire lifetime: note events only automate existing nodes. It intentionally
 * implements a small feature set first rather than reproducing Tone.js.
 */
export class WebAudioBackend implements Synth8AudioBackend {
  private readonly context: AudioContext;
  private readonly output: AudioNode;
  private readonly bpm: number;
  private readonly maxVoices: number;
  private readonly pools = new Map<string, Voice[]>();
  private origin = 0;
  private running = false;
  private stats: WebAudioBackendStats = {
    voicesCreated: 0, voicesReused: 0, voicesStolen: 0,
    eventsScheduled: 0, activeVoices: 0, maxActiveVoices: 0,
  };

  constructor(options: WebAudioBackendOptions) {
    this.context = options.context;
    this.output = options.output ?? options.context.destination;
    this.bpm = options.bpm ?? 120;
    this.maxVoices = Math.max(1, Math.floor(options.maxVoices ?? 8));
  }

  start(): void {
    this.origin = this.context.currentTime;
    this.running = true;
    void this.context.resume?.();
  }

  stop(): void {
    this.running = false;
    for (const pool of this.pools.values()) {
      for (const voice of pool) {
        voice.gain.gain.cancelScheduledValues(this.context.currentTime);
        voice.gain.gain.setValueAtTime(0, this.context.currentTime);
        voice.active = false;
      }
    }
    this.stats.activeVoices = 0;
  }

  schedule(events: readonly Synth8Event[]): void {
    if (!this.running) this.start();
    this.refreshActiveVoices();
    for (const event of events) {
      const time = this.origin + event.time * (60 / this.bpm);
      if (event.kind === "note") this.scheduleNote(event, time);
      else this.scheduleDrum(event, time);
    }
  }

  private scheduleDrum(event: Extract<Synth8Event, { kind: "drum" }>, time: number): void {
    const playback = eventPlayback(event);
    const instrument = `drums:${event.drum}:${event.instrument ?? "default"}`;
    const pool = this.pools.get(instrument) ?? this.createPool(instrument, eventPlayback(event));
    const duration = Math.max(0.02, Math.min(0.25, event.duration * (60 / this.bpm)));
    const voice = this.acquire(pool, time);
    const start = Math.max(time, this.context.currentTime);
    const end = start + duration;
    const frequencies: Record<string, number> = { kick: 90, snare: 180, hihat: 5000, openhat: 4000, clap: 900, crash: 3000 };
    voice.oscillator.frequency.setValueAtTime(frequencies[event.drum] ?? 110, start);
    voice.gain.gain.cancelScheduledValues(start);
    voice.gain.gain.setValueAtTime(Math.min(1, (event.velocity ?? 0.8) * (playback.gain ?? 1)), start);
    voice.gain.gain.exponentialRampToValueAtTime(0.001, end);
    voice.startedAt = start;
    voice.endsAt = end;
    voice.active = true;
    this.stats.eventsScheduled += 1;
    this.stats.activeVoices += 1;
    this.stats.maxActiveVoices = Math.max(this.stats.maxActiveVoices, this.stats.activeVoices);
  }

  private scheduleNote(event: Extract<Synth8Event, { kind: "note" }>, time: number): void {
    const playback = eventPlayback(event);
    const instrument = event.instrument ?? "default";
    const pool = this.pools.get(instrument) ?? this.createPool(instrument, playback);
    const duration = Math.max(0.005, event.duration * (60 / this.bpm));
    const voice = this.acquire(pool, time);
    const now = this.context.currentTime;
    const start = Math.max(time, now);
    const end = start + duration;
    const envelope = playback.envelope ?? {};
    const effects = playback.effects ?? {};
    const gain = Math.max(0, Math.min(1, (event.velocity ?? 0.8) * (event.controls?.gain ?? 1) * (playback.gain ?? 1)));
    const frequency = pitchToFrequency(event.pitch);
    const pan = Math.max(-1, Math.min(1, event.controls?.pan ?? playback.pan ?? 0));
    const cutoff = playback.filter?.cutoff ?? effects.lowpass;
    // Match Tone.Synth's default envelope more closely for layers without a
    // preset: short attack, audible decay, lower sustain, and a real release
    // tail instead of an abrupt gate.
    const attack = Math.max(0.001, envelope.attack ?? 0.01);
    const decay = Math.max(0, envelope.decay ?? 0.1);
    const sustain = Math.max(0, Math.min(1, envelope.sustain ?? 0.3));
    const release = Math.max(0, envelope.release ?? 0.5);
    voice.panner.pan.setValueAtTime(pan, start);
    if (cutoff !== undefined) voice.filter.frequency.setValueAtTime(cutoff, start);
    if (playback.filter?.resonance !== undefined) voice.filter.Q.setValueAtTime(playback.filter.resonance * 20, start);
    if (voice.distortion && effects.distortion !== undefined) voice.distortion.curve = distortionCurve(effects.distortion);
    if (voice.vibrato && voice.vibratoGain && playback.pitch?.vibratoRate !== undefined) {
      voice.vibrato.frequency.setValueAtTime(playback.pitch.vibratoRate, start);
      voice.vibratoGain.gain.setValueAtTime(frequency * (playback.pitch.vibratoDepth ?? 0) * 0.08, start);
    }
    if (playback.filter?.envelope) {
      const filterEnvelope = playback.filter.envelope;
      voice.filter.frequency.setValueAtTime(filterEnvelope.start, start);
      voice.filter.frequency.linearRampToValueAtTime(filterEnvelope.peak, start + filterEnvelope.attack);
      voice.filter.frequency.linearRampToValueAtTime(filterEnvelope.sustain, start + filterEnvelope.attack + filterEnvelope.decay);
      voice.filter.frequency.linearRampToValueAtTime(filterEnvelope.sustain, end);
      voice.filter.frequency.linearRampToValueAtTime(filterEnvelope.start, end + filterEnvelope.release);
    }

    voice.oscillator.frequency.cancelScheduledValues(start);
    voice.oscillator.frequency.setValueAtTime(frequency, start);
    voice.gain.gain.cancelScheduledValues(start);
    voice.gain.gain.setValueAtTime(0, start);
    voice.gain.gain.linearRampToValueAtTime(gain, start + attack);
    voice.gain.gain.linearRampToValueAtTime(gain * sustain, start + attack + decay);
    voice.gain.gain.setValueAtTime(gain * sustain, Math.max(start + attack + decay, end - release));
    voice.gain.gain.linearRampToValueAtTime(0, end + release);
    voice.startedAt = start;
    voice.endsAt = end + release;
    voice.active = true;
    this.stats.eventsScheduled += 1;
    this.stats.activeVoices = pool.reduce((count, item) => count + (item.active ? 1 : 0), 0);
    this.stats.maxActiveVoices = Math.max(this.stats.maxActiveVoices, this.stats.activeVoices);
  }

  private createPool(instrument: string, playback: PlaybackConfig = {}): Voice[] {
    const pool: Voice[] = [];
    for (let index = 0; index < this.maxVoices; index += 1) {
      const oscillator = this.context.createOscillator();
      const drumName = instrument.startsWith("drums:") ? instrument.split(":")[1] : undefined;
      const noiseDrum = drumName !== undefined && !["kick", "tom", "lowtom", "midtom", "hitom"].includes(drumName);
      oscillator.type = waveform(playback.sound ?? instrument);
      const filter = this.context.createBiquadFilter();
      filter.type = noiseDrum || (playback.effects?.highpass !== undefined && playback.effects?.lowpass === undefined)
        ? "highpass"
        : "lowpass";
      filter.frequency.value = noiseDrum
        ? (drumName === "hihat" || drumName === "openhat" ? 4500 : drumName === "crash" || drumName === "ride" ? 2800 : 900)
        : playback.effects?.lowpass ?? playback.effects?.highpass ?? 20000;
      const gain = this.context.createGain();
      gain.gain.value = 0;
      const panner = this.context.createStereoPanner();
      const effects = playback.effects ?? {};
      const distortion = effects.distortion !== undefined ? this.context.createWaveShaper() : undefined;
      if (distortion) distortion.curve = distortionCurve(effects.distortion ?? 0);
      const wet = effects.echo ?? effects.reverb ?? effects.room ?? effects.chorus;
      const delay = wet !== undefined || effects.delay !== undefined ? this.context.createDelay(2) : undefined;
      const delayGain = delay ? this.context.createGain() : undefined;
      const delayFeedback = delay && (effects.echo !== undefined || effects.reverb !== undefined || effects.room !== undefined)
        ? this.context.createGain()
        : undefined;
      if (delay) {
        delay.delayTime.value = effects.delay ?? (effects.reverb !== undefined || effects.room !== undefined ? 0.32 : 0.18);
        delayGain!.gain.value = Math.min(0.8, wet ?? 0.15);
        gain.connect(delay).connect(delayGain!).connect(this.output);
        if (delayFeedback) {
          delayFeedback.gain.value = Math.min(0.85, effects.echo ?? effects.reverb ?? effects.room ?? 0.2);
          delay.connect(delayFeedback).connect(delay);
        }
      }
      const source = distortion ? gain.connect(distortion) : gain;
      source.connect(panner).connect(this.output);
      const reverbAmount = effects.reverb ?? effects.room;
      const convolver = reverbAmount !== undefined ? this.context.createConvolver() : undefined;
      const reverbGain = convolver ? this.context.createGain() : undefined;
      if (convolver && reverbGain) {
        const impulseLength = Math.floor(this.context.sampleRate * (0.35 + (reverbAmount ?? 0) * 1.65));
        const impulse = this.context.createBuffer(2, impulseLength, this.context.sampleRate);
        for (let channel = 0; channel < impulse.numberOfChannels; channel++) {
          const data = impulse.getChannelData(channel);
          for (let sample = 0; sample < data.length; sample++) {
            data[sample] = (Math.random() * 2 - 1) * (1 - sample / data.length) ** (1.5 + (1 - (reverbAmount ?? 0)) * 2);
          }
        }
        convolver.buffer = impulse;
        reverbGain.gain.value = Math.min(0.65, reverbAmount ?? 0);
        gain.connect(convolver).connect(reverbGain).connect(this.output);
      }
      let noise: AudioBufferSourceNode | undefined;
      if (noiseDrum) {
        const buffer = this.context.createBuffer(1, this.context.sampleRate, this.context.sampleRate);
        const data = buffer.getChannelData(0);
        for (let sample = 0; sample < data.length; sample++) data[sample] = Math.random() * 2 - 1;
        noise = this.context.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;
        noise.connect(filter);
        noise.start();
      } else {
        oscillator.connect(filter);
      }
      filter.connect(gain);
      const vibrato = playback.pitch?.vibratoRate !== undefined ? this.context.createOscillator() : undefined;
      const vibratoGain = vibrato ? this.context.createGain() : undefined;
      if (vibrato && vibratoGain) {
        vibrato.frequency.value = playback.pitch?.vibratoRate ?? 5;
        vibratoGain.gain.value = 0;
        vibrato.connect(vibratoGain).connect(oscillator.frequency);
        vibrato.start();
      }
      const chorusLfo = effects.chorus !== undefined ? this.context.createOscillator() : undefined;
      const chorusDepth = chorusLfo && delay ? this.context.createGain() : undefined;
      if (chorusLfo && chorusDepth && delay) {
        chorusLfo.frequency.value = 0.8;
        chorusDepth.gain.value = (effects.chorus ?? 0) * 0.008;
        chorusLfo.connect(chorusDepth).connect(delay.delayTime);
        chorusLfo.start();
      }
      oscillator.start();
      pool.push({ oscillator, gain, filter, panner, delay, delayGain, delayFeedback, chorusLfo, chorusDepth, convolver, reverbGain, distortion, vibrato, vibratoGain, noise, startedAt: 0, endsAt: 0, active: false });
      this.stats.voicesCreated += 1;
    }
    this.pools.set(instrument, pool);
    return pool;
  }

  private acquire(pool: Voice[], time: number): Voice {
    const idle = pool.find((voice) => !voice.active || voice.endsAt <= time);
    if (idle) {
      this.stats.voicesReused += 1;
      idle.active = false;
      return idle;
    }
    let oldest = pool[0];
    for (const voice of pool) if (voice.endsAt < oldest.endsAt) oldest = voice;
    oldest.gain.gain.cancelScheduledValues(time);
    oldest.gain.gain.setValueAtTime(0, time);
    this.stats.voicesStolen += 1;
    return oldest;
  }

  private refreshActiveVoices(): void {
    const now = this.context.currentTime;
    let active = 0;
    for (const pool of this.pools.values()) {
      for (const voice of pool) {
        if (voice.active && voice.endsAt <= now) voice.active = false;
        if (voice.active) active += 1;
      }
    }
    this.stats.activeVoices = active;
  }

  getStats(): WebAudioBackendStats {
    this.refreshActiveVoices();
    return { ...this.stats };
  }

  dispose(): void {
    this.stop();
    for (const pool of this.pools.values()) {
      for (const voice of pool) {
        voice.oscillator.stop();
        voice.oscillator.disconnect();
        voice.filter.disconnect();
        voice.gain.disconnect();
        voice.panner.disconnect();
        voice.delay?.disconnect();
        voice.delayGain?.disconnect();
        voice.delayFeedback?.disconnect();
        voice.chorusLfo?.disconnect();
        voice.chorusDepth?.disconnect();
        voice.convolver?.disconnect();
        voice.reverbGain?.disconnect();
        voice.distortion?.disconnect();
        voice.vibrato?.disconnect();
        voice.vibratoGain?.disconnect();
        voice.noise?.disconnect();
      }
    }
    this.pools.clear();
  }
}
