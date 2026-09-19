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
    setMasterGain: (gain: number) => backend.setMasterGain?.(gain),
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
  // Tear down the previous graph before doing expensive offline rendering.
  // Otherwise replaying a song briefly keeps both audio graphs alive and can
  // exhaust browser audio resources on large compositions.
  activePlayback?.dispose();
  activePlayback = undefined;
  const playback = await prepare(pattern, options);
  activePlayback = playback;
  await options.onReady?.(playback);
  await playback.start();
  await playback.ready;
};

export const pause = (): void => activePlayback?.pause();
export const resume = (): void => activePlayback?.resume();
export const stop = (): void => { activePlayback?.dispose(); activePlayback = undefined; };
export const setMasterGain = (gain: number): void => activePlayback?.setMasterGain(gain);
export const getPlaybackPosition = (): number => activePlayback?.getPosition?.() ?? 0;
