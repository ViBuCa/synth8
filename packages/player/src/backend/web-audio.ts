import type { Synth8AudioBackend, Synth8Event } from "@vibuca/synth8-core";

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
  startedAt: number;
  endsAt: number;
  active: boolean;
};

const waveform = (instrument?: string): OscillatorType => {
  if (instrument === "triangle" || instrument === "square" || instrument === "sawtooth") return instrument;
  return "sine";
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
    const instrument = event.instrument ?? "drums";
    const pool = this.pools.get(instrument) ?? this.createPool(instrument);
    const duration = Math.max(0.02, Math.min(0.25, event.duration * (60 / this.bpm)));
    const voice = this.acquire(pool, time);
    const start = Math.max(time, this.context.currentTime);
    const end = start + duration;
    const frequencies: Record<string, number> = { kick: 90, snare: 180, hihat: 5000, openhat: 4000, clap: 900, crash: 3000 };
    voice.oscillator.frequency.setValueAtTime(frequencies[event.drum] ?? 220, start);
    voice.gain.gain.cancelScheduledValues(start);
    voice.gain.gain.setValueAtTime(Math.min(1, event.velocity ?? 0.8), start);
    voice.gain.gain.exponentialRampToValueAtTime(0.001, end);
    voice.startedAt = start;
    voice.endsAt = end;
    voice.active = true;
    this.stats.eventsScheduled += 1;
    this.stats.activeVoices += 1;
    this.stats.maxActiveVoices = Math.max(this.stats.maxActiveVoices, this.stats.activeVoices);
  }

  private scheduleNote(event: Extract<Synth8Event, { kind: "note" }>, time: number): void {
    const instrument = event.instrument ?? "default";
    const pool = this.pools.get(instrument) ?? this.createPool(instrument);
    const duration = Math.max(0.005, event.duration * (60 / this.bpm));
    const voice = this.acquire(pool, time);
    const now = this.context.currentTime;
    const start = Math.max(time, now);
    const end = start + duration;
    const gain = Math.max(0, Math.min(1, event.controls?.gain ?? 0.8));
    const frequency = pitchToFrequency(event.pitch);
    const pan = Math.max(-1, Math.min(1, event.controls?.pan ?? 0));
    const cutoff = typeof event.parameters?.filter === "object" && event.parameters.filter
      ? (event.parameters.filter as { cutoff?: number }).cutoff
      : undefined;
    voice.panner.pan.setValueAtTime(pan, start);
    if (cutoff !== undefined) voice.filter.frequency.setValueAtTime(cutoff, start);

    voice.oscillator.frequency.cancelScheduledValues(start);
    voice.oscillator.frequency.setValueAtTime(frequency, start);
    voice.gain.gain.cancelScheduledValues(start);
    voice.gain.gain.setValueAtTime(0, start);
    voice.gain.gain.linearRampToValueAtTime(gain, start + 0.005);
    voice.gain.gain.linearRampToValueAtTime(0, end);
    voice.startedAt = start;
    voice.endsAt = end;
    voice.active = true;
    this.stats.eventsScheduled += 1;
    this.stats.activeVoices = pool.reduce((count, item) => count + (item.active ? 1 : 0), 0);
    this.stats.maxActiveVoices = Math.max(this.stats.maxActiveVoices, this.stats.activeVoices);
  }

  private createPool(instrument: string): Voice[] {
    const pool: Voice[] = [];
    for (let index = 0; index < this.maxVoices; index += 1) {
      const oscillator = this.context.createOscillator();
      oscillator.type = waveform(instrument);
      const filter = this.context.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 20000;
      const gain = this.context.createGain();
      gain.gain.value = 0;
      const panner = this.context.createStereoPanner();
      oscillator.connect(filter).connect(gain).connect(panner).connect(this.output);
      oscillator.start();
      pool.push({ oscillator, gain, filter, panner, startedAt: 0, endsAt: 0, active: false });
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
      }
    }
    this.pools.clear();
  }
}
