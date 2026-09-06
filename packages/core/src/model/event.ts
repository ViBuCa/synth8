import type { Articulation } from "./ast";
import type { PlaybackConfig } from "./playback-config";

/** The compact compiled event retained for the existing player. */
export type EventType = 'drum' | 'note';

export type Event = {
  time: number;
  dur: number;
  type: EventType;
  value: string;
  velocity?: number;
  articulation?: Articulation;
  bend?: number;
};

/**
 * Backend-independent musical event. Times and durations are in beats.
 * Nothing in this type refers to an audio library or an AudioContext.
 */
export type Synth8Event =
  | {
      kind: "note";
      time: number;
      duration: number;
      pitch: string;
      velocity?: number;
      articulation?: Articulation;
      bend?: number;
      instrument?: string;
      controls?: {
        gain?: number;
        pan?: number;
      };
      parameters?: Record<string, unknown>;
    }
  | {
      kind: "drum";
      time: number;
      duration: number;
      drum: string;
      velocity?: number;
      instrument?: string;
      controls?: {
        gain?: number;
        pan?: number;
      };
      parameters?: Record<string, unknown>;
    };

/** A deliberately small contract implemented by Tone, MIDI, and other backends. */
export interface Synth8AudioBackend {
  schedule(events: readonly Synth8Event[]): void;
  start?(): Promise<void> | void;
  stop?(): void;
  dispose?(): void;
}

/** Convert the legacy compiled representation to the public event representation. */
export const toSynth8Event = (
  event: Event,
  playback?: PlaybackConfig,
): Synth8Event => {
  const controls = playback && (playback.gain !== undefined || playback.pan !== undefined)
    ? {
      ...(playback.gain !== undefined ? { gain: playback.gain } : {}),
      ...(playback.pan !== undefined ? { pan: playback.pan } : {}),
    }
    : undefined;
  const parameters = playback ? { ...playback } : undefined;
  if (parameters) {
    delete parameters.gain;
    delete parameters.pan;
  }
  const common = {
    time: event.time,
    duration: event.dur,
    ...(event.velocity !== undefined ? { velocity: event.velocity } : {}),
    ...((playback?.preset ?? playback?.sound ?? playback?.bank) !== undefined
      ? { instrument: playback?.preset ?? playback?.sound ?? playback?.bank }
      : {}),
    ...(controls ? { controls } : {}),
    ...(parameters && Object.keys(parameters).length > 0 ? { parameters } : {}),
  };
  return event.type === "note"
    ? {
      kind: "note",
      pitch: event.value,
      ...(event.articulation ? { articulation: event.articulation } : {}),
      ...(event.bend !== undefined ? { bend: event.bend } : {}),
      ...common,
    }
    : { kind: "drum", drum: event.value, ...common };
};
