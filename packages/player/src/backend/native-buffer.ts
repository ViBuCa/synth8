import type { PreparedPlayback } from "../model";

export type NativeBufferPlaybackOptions = {
  context: AudioContext;
  buffer: AudioBuffer;
  loop?: boolean;
  loopEnd?: number;
  output?: AudioNode;
  gain?: number;
};

/** Native replacement for Tone.Player's small playback lifecycle. */
export const createNativeBufferPlayback = (
  options: NativeBufferPlaybackOptions,
): PreparedPlayback => {
  const { context, buffer } = options;
  const output = options.output ?? context.destination;
  const gain = context.createGain();
  gain.gain.value = options.gain ?? 1;
  gain.connect(output);

  let source: AudioBufferSourceNode | undefined;
  let started = false;
  let paused = false;
  let offset = 0;
  let startedAt = 0;
  const duration = Math.max(0.001, options.loopEnd ?? buffer.duration);

  const currentOffset = (): number => {
    if (!started || paused) return offset;
    const elapsed = context.currentTime - startedAt;
    if (options.loop) return ((elapsed % duration) + duration) % duration;
    return Math.min(duration, Math.max(0, elapsed));
  };

  const disposeSource = (): void => {
    if (!source) return;
    try { source.stop(); } catch { /* already stopped */ }
    source.disconnect();
    source = undefined;
  };

  const startSource = (startOffset: number): void => {
    disposeSource();
    source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = options.loop ?? false;
    source.loopStart = 0;
    source.loopEnd = Math.min(duration, buffer.duration);
    source.connect(gain);
    source.start(context.currentTime, Math.max(0, startOffset));
    startedAt = context.currentTime - startOffset;
  };

  const playback: PreparedPlayback = {
    playbackMode: "rendered",
    start() {
      void context.resume?.();
      offset = 0;
      paused = false;
      started = true;
      startSource(0);
    },
    pause() {
      if (!started || paused) return;
      offset = currentOffset();
      paused = true;
      disposeSource();
    },
    resume() {
      if (!started || !paused) return;
      paused = false;
      startSource(offset);
    },
    stop() {
      disposeSource();
      started = false;
      paused = false;
      offset = 0;
    },
    dispose() {
      playback.stop();
      gain.disconnect();
    },
  };

  return playback;
};
