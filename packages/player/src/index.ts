import * as Tone from "tone";
import type { Pattern } from "@vibuca/core";

export type PlayOptions = {
  bpm?: number;
};

const kick = new Tone.MembraneSynth().toDestination();

const snare = new Tone.NoiseSynth({
  noise: { type: "white" },
  envelope: {
    attack: 0.001,
    decay: 0.15,
    sustain: 0
  }
}).toDestination();

const hihat = new Tone.MetalSynth({
  envelope: {
    attack: 0.001,
    decay: 0.05,
    release: 0.01
  },
  harmonicity: 5.1,
  modulationIndex: 32,
  resonance: 4000,
  octaves: 1.5
})
hihat.frequency.value = 300;
hihat.toDestination();

const playDrum = (value: string, time: number) => {
  switch (value) {
    case "kick":
      kick.triggerAttackRelease("C1", "8n", time);
      break;

    case "snare":
      snare.triggerAttackRelease("16n", time);
      break;

    case "hihat":
      hihat.triggerAttackRelease("32n", time);
      break;

    default:
      console.warn(`Unknown drum sound: ${value}`);
  }
};

export const play = async (
  pattern: Pattern,
  options: PlayOptions = {}
): Promise<void> => {
  const bpm = options.bpm ?? 120;

  await Tone.start();

  Tone.Transport.stop();
  Tone.Transport.cancel();
  Tone.Transport.bpm.value = bpm;

  const secondsPerBeat = 60 / bpm;
  const loopDuration = pattern.length * secondsPerBeat;

  for (const event of pattern.events) {
    const eventOffset = event.time * secondsPerBeat;

    Tone.Transport.scheduleRepeat(
      (time) => {
        playDrum(event.value, time);
      },
      loopDuration,
      eventOffset
    );
  }

  Tone.Transport.start();
};

export const stop = (): void => {
  Tone.Transport.stop();
  Tone.Transport.cancel();
};