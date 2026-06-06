import * as Tone from "tone";
import { kick, snare, hihat, clap, openhat, tom, cowbell, rim } from "./drum/drum-synths";
import type { Pattern } from "@vibuca/core";

export type PlayOptions = {
  bpm?: number;
};

const playDrum = (value: string, time: number) => {
  switch (value) {
    case "kick":
      kick.triggerAttackRelease("C1", "8n", time);
      break;

    case "snare":
      snare.triggerAttackRelease("16n", time);
      break;

    case "clap":
      clap.triggerAttackRelease("16n", time);
      break;

    case "hihat":
      hihat.triggerAttackRelease("32n", time);
      break;

    case "openhat":
      openhat.triggerAttackRelease("8n", time);
      break;

    case "tom":
      tom.triggerAttackRelease("G1", "8n", time);
      break;

    case "rim":
      rim.triggerAttackRelease("32n", time);
      break;

    case "cowbell":
      cowbell.triggerAttackRelease("16n", time);
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

    const transport = Tone.getTransport();
  transport.stop();
  transport.cancel();
  transport.bpm.value = bpm;

  const secondsPerBeat = 60 / bpm;
  const loopDuration = pattern.length * secondsPerBeat;

  for (const event of pattern.events) {
    const eventOffset = event.time * secondsPerBeat;

    transport.scheduleRepeat(
      (time) => {
        playDrum(event.value, time);
      },
      loopDuration,
      eventOffset
    );
  }

  transport.start();
};

export const stop = (): void => {
    const transport = Tone.getTransport();
  transport.stop();
  transport.cancel();
};