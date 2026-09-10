import type { Pattern, AudioClock, Synth8AudioBackend } from "@vibuca/synth8-core";
import type { PlayOptions, PreparedPlayback } from "../model";
import { BackendScheduler } from "./backend-scheduler";
import { prepareNativeRendered } from "../backend/native-playback";
import { WebAudioBackend } from "../backend/web-audio";

let activePlayback: PreparedPlayback | undefined;
let sharedContext: AudioContext | undefined;

const getContext = (): AudioContext => {
  if (sharedContext) return sharedContext;
  const Constructor = globalThis.AudioContext;
  if (!Constructor) throw new Error("This environment does not provide AudioContext.");
  sharedContext = new Constructor();
  return sharedContext;
};

const prepareLive = (pattern: Pattern, options: PlayOptions, context: AudioContext): PreparedPlayback => {
  const backend: Synth8AudioBackend = options.backend ?? new WebAudioBackend({
    context,
    bpm: options.bpm,
    maxVoices: 16,
    output: options.output,
  });
  const clock: AudioClock = options.clock ?? context;
  const scheduler = new BackendScheduler(pattern, backend, clock, {
    bpm: options.bpm ?? 120,
    lookAhead: options.lookAhead,
    updateInterval: options.updateInterval,
  });
  return {
    playbackMode: "live",
    start: () => scheduler.start(),
    pause: () => scheduler.pause(),
    resume: () => scheduler.resume(),
    stop: () => { scheduler.stop(); backend.dispose?.(); },
    dispose: () => { scheduler.stop(); backend.dispose?.(); },
  };
};

export const prepare = async (pattern: Pattern, options: PlayOptions = {}): Promise<PreparedPlayback> => {
  const context = getContext();
  const mode = options.playbackMode === "live" ? "live" : "rendered";
  if (mode === "live") return prepareLive(pattern, options, context);
  return prepareNativeRendered(pattern, { context, bpm: options.bpm });
};

export const play = async (pattern: Pattern, options: PlayOptions = {}): Promise<void> => {
  const playback = await prepare(pattern, options);
  activePlayback?.stop();
  activePlayback = playback;
  await options.onReady?.(playback);
  playback.start();
};

export const pause = (): void => activePlayback?.pause();
export const resume = (): void => activePlayback?.resume();
export const stop = (): void => { activePlayback?.stop(); activePlayback = undefined; };
