import type { Pattern } from "@vibuca/synth8-core";
import type { PreparedPlayback } from "../model";
import { createNativeBufferPlayback } from "./native-buffer";
import { renderNative } from "./native-render";

export type NativeRenderedPlaybackOptions = {
  context: AudioContext;
  bpm?: number;
  output?: AudioNode;
  masterGain?: number;
  tail?: number;
};

/** Prepare a rendered native loop without Tone.Transport or Tone.Player. */
export const prepareNativeRendered = async (
  pattern: Pattern,
  options: NativeRenderedPlaybackOptions,
): Promise<PreparedPlayback> => {
  const buffer = await renderNative(pattern, {
    bpm: options.bpm,
    masterGain: options.masterGain,
    tail: options.tail,
  });
  const secondsPerBeat = 60 / (options.bpm ?? 120);
  const loopEnd = pattern.length * secondsPerBeat;
  return createNativeBufferPlayback({
    context: options.context,
    buffer,
    output: options.output,
    loop: true,
    loopEnd,
  });
};
