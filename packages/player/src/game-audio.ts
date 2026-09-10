import type { Pattern } from "@vibuca/synth8-core";
import type { GameAudio, GameAudioOptions, GameMusicOptions, GameSfxOptions, PlaySfxOptions, PreparedPlayback, PreparedSfx } from "./model";
import { renderToAudioBuffer } from "./playback/render";
import { prepare as preparePlayback } from "./playback/play";
import { createNativeBufferPlayback } from "./backend/native-buffer";

const DEFAULT_BPM = 120;
const DEFAULT_SFX_VOICES = 8;
const volume = (value: number): number => Math.max(0, value);

const getContext = (): AudioContext => {
  const Constructor = globalThis.AudioContext;
  if (!Constructor) throw new Error("This environment does not provide AudioContext.");
  return new Constructor();
};

/** Create a Tone-free game audio mixer using native Web Audio nodes. */
export const createGameAudio = async (options: GameAudioOptions = {}): Promise<GameAudio> => {
  const context = getContext();
  await context.resume().catch(() => undefined);

  let masterVolume = volume(options.masterVolume ?? 1);
  let musicVolume = volume(options.musicVolume ?? 1);
  let sfxVolume = volume(options.sfxVolume ?? 1);
  let ducking = 1;
  const master = context.createGain();
  const music = context.createGain();
  const sfx = context.createGain();
  music.connect(master);
  sfx.connect(master);
  master.connect(context.destination);
  master.gain.value = masterVolume;
  music.gain.value = musicVolume;
  sfx.gain.value = sfxVolume;

  const musicSet = new Set<PreparedPlayback>();
  const sfxSet = new Set<InternalSfx>();
  let currentMusic: PreparedPlayback | undefined;

  const prepareMusic = async (pattern: Pattern, musicOptions: GameMusicOptions = {}): Promise<PreparedPlayback> => {
    const bpm = musicOptions.bpm ?? DEFAULT_BPM;
    // Native rendered playback is deterministic and also covers the old
    // streamed mode without creating a player for every rendered chunk.
    if (musicOptions.playbackMode !== "live") {
      const buffer = await renderToAudioBuffer(pattern, { bpm });
      const playback = createNativeBufferPlayback({
        context, buffer, output: music, loop: true,
        loopEnd: pattern.length * 60 / bpm,
        gain: 1,
      });
      musicSet.add(playback);
      return wrapMusic(playback);
    }
    const playback = await preparePlayback(pattern, { ...musicOptions, bpm, playbackMode: "live", output: music });
    musicSet.add(playback);
    return wrapMusic(playback);
  };

  const wrapMusic = (playback: PreparedPlayback): PreparedPlayback => ({
    playbackMode: playback.playbackMode,
    start() {
      if (currentMusic && currentMusic !== playback) currentMusic.stop();
      currentMusic = playback;
      playback.start();
    },
    pause: () => playback.pause(),
    resume: () => playback.resume(),
    stop: () => playback.stop(),
    dispose() { playback.dispose(); musicSet.delete(playback); if (currentMusic === playback) currentMusic = undefined; },
  });

  type InternalSfx = PreparedSfx & { buffer: AudioBuffer; players: Array<{ source?: AudioBufferSourceNode; gain: GainNode }>; next: number };
  const prepareSfx = async (pattern: Pattern, sfxOptions: GameSfxOptions = {}): Promise<PreparedSfx> => {
    const bpm = sfxOptions.bpm ?? DEFAULT_BPM;
    const count = Math.max(1, Math.floor(sfxOptions.voices ?? DEFAULT_SFX_VOICES));
    const buffer = await renderToAudioBuffer(pattern, { bpm });
    const prepared = {
      buffer, duration: pattern.length * 60 / bpm, voices: count, next: 0,
      players: Array.from({ length: count }, () => { const gain = context.createGain(); gain.connect(sfx); return { gain }; }),
      dispose() { for (const player of prepared.players) { try { player.source?.stop(); } catch {} player.gain.disconnect(); } sfxSet.delete(prepared); },
    } as InternalSfx;
    sfxSet.add(prepared);
    return prepared;
  };

  const playSfx = (sfxValue: PreparedSfx, playOptions: PlaySfxOptions = {}): void => {
    const prepared = sfxValue as InternalSfx;
    const player = prepared.players[prepared.next++ % prepared.players.length];
    try { player.source?.stop(); } catch {}
    const source = context.createBufferSource();
    source.buffer = prepared.buffer;
    source.playbackRate.value = playOptions.playbackRate ?? 1;
    player.gain.gain.value = volume(playOptions.volume ?? 1);
    source.connect(player.gain);
    source.start();
    player.source = source;
  };

  return {
    prepareMusic, prepareSfx, playSfx,
    setMasterVolume(value) { masterVolume = volume(value); master.gain.value = masterVolume; },
    setMusicVolume(value) { musicVolume = volume(value); music.gain.value = musicVolume * ducking; },
    setSfxVolume(value) { sfxVolume = volume(value); sfx.gain.value = sfxVolume; },
    setMusicDucking(value) {
      const amount = typeof value === "number" ? value : value.amount ?? 0.5;
      ducking = Math.min(1, Math.max(0, amount));
      const ramp = typeof value === "number" ? 0 : Math.max(0, value.ramp ?? 0);
      const now = context.currentTime;
      music.gain.cancelScheduledValues(now);
      music.gain.setValueAtTime(music.gain.value, now);
      music.gain.linearRampToValueAtTime(musicVolume * ducking, now + ramp);
    },
    dispose() { for (const item of [...musicSet]) item.dispose(); for (const item of [...sfxSet]) item.dispose(); master.disconnect(); void context.close?.(); },
  };
};
