import Phaser from "phaser";
import { compile } from "@vibuca/synth8-core";
import { createGameAudio, prepare } from "@vibuca/synth8-player";
import type {
  GameAudio, GameAudioOptions, GameMusicOptions, GameSfxOptions,
  PlayOptions, PlaySfxOptions, PreparedPlayback, PreparedSfx,
  MusicDuckingOptions,
} from "@vibuca/synth8-player";

/** A track can be registered once and prepared by any scene. */
export type Synth8Track = { source: string; options?: GameMusicOptions };

type State = {
  audio?: GameAudio;
  tracks: Map<string, Synth8Track>;
  prepared: Map<string, Promise<PreparedPlayback>>;
  stack: PreparedPlayback[];
  sfx: Map<string, PreparedSfx>;
};

// Scene plugins are recreated as scenes change. Keeping this outside the
// plugin is intentional: the audio service belongs to the Game, not a Scene.
const states = new WeakMap<object, State>();

export class Synth8Plugin extends Phaser.Plugins.ScenePlugin {
  private state(): State {
    const game = this.game as unknown as object;
    let state = states.get(game);
    if (!state) {
      state = { tracks: new Map(), prepared: new Map(), stack: [], sfx: new Map() };
      states.set(game, state);
      // Phaser 3 and 4 both expose the Game event emitter. This is also safe
      // for small test doubles used in headless/WebView environments.
      (this.game as any).events?.once?.("destroy", () => {
        state?.audio?.dispose();
        state!.audio = undefined;
        state!.prepared.clear();
        state!.tracks.clear();
        state!.stack.length = 0;
        for (const sfx of state!.sfx.values()) sfx.dispose();
        state!.sfx.clear();
        states.delete(game);
      });
    }
    return state;
  }

  private async audio(options?: GameAudioOptions): Promise<GameAudio> {
    const state = this.state();
    if (!state.audio) state.audio = await createGameAudio(options);
    return state.audio;
  }

  async startAudio(options?: GameAudioOptions): Promise<GameAudio> {
    return this.audio(options);
  }
  async startGameAudio(options?: GameAudioOptions): Promise<GameAudio> {
    return this.startAudio(options);
  }

  async play(source: string, options: PlayOptions = {}): Promise<PreparedPlayback> {
    const playback = await prepare(compile(source), options);
    playback.start();
    return playback;
  }
  pause(): void { this.playback?.pause(); }
  resume(): void { this.playback?.resume(); }
  stop(): void { this.playback?.stop(); this.playback = undefined; }
  private playback?: PreparedPlayback;

  /** Register a stable key; keys survive scene transitions. */
  registerTrack(key: string, source: string, options?: GameMusicOptions): this {
    this.state().tracks.set(key, { source, options });
    return this;
  }
  unregisterTrack(key: string): void {
    const state = this.state();
    state.tracks.delete(key);
    state.prepared.get(key)?.then((p) => p.dispose()).catch(() => undefined);
    state.prepared.delete(key);
  }

  async preloadTrack(key: string, source?: string, options?: GameMusicOptions): Promise<PreparedPlayback> {
    const state = this.state();
    if (source !== undefined) this.registerTrack(key, source, options);
    const track = state.tracks.get(key);
    if (!track) throw new Error(`Unknown Synth8 track: ${key}`);
    let pending = state.prepared.get(key);
    if (!pending) {
      pending = this.audio().then((audio) => audio.prepareMusic(compile(track.source), track.options));
      state.prepared.set(key, pending);
      pending.catch(() => state.prepared.delete(key));
    }
    return pending;
  }
  /** Alias useful in loading scenes. */
  preload(key: string, source?: string, options?: GameMusicOptions): Promise<PreparedPlayback> {
    return this.preloadTrack(key, source, options);
  }
  prepareTrack(key: string, source?: string, options?: GameMusicOptions): Promise<PreparedPlayback> {
    return this.preloadTrack(key, source, options);
  }

  async playTrack(key: string, options?: GameMusicOptions): Promise<PreparedPlayback> {
    const playback = options
      ? await this.audio().then((a) => {
          const track = this.state().tracks.get(key);
          if (!track) throw new Error(`Unknown Synth8 track: ${key}`);
          return a.prepareMusic(compile(track.source), { ...track.options, ...options });
        })
      : await this.preloadTrack(key);
    playback.start();
    this.music = playback;
    return playback;
  }

  async playMusic(sourceOrKey: string, options?: GameMusicOptions): Promise<PreparedPlayback> {
    const state = this.state();
    const registered = state.tracks.get(sourceOrKey);
    if (registered) return this.playTrack(sourceOrKey, options);
    const audio = await this.audio();
    const playback = await audio.prepareMusic(compile(sourceOrKey), options);
    playback.start();
    this.music = playback;
    return playback;
  }
  pauseMusic(): void { this.state().stack.at(-1)?.pause() ?? this.music?.pause(); }
  resumeMusic(): void { this.state().stack.at(-1)?.resume() ?? this.music?.resume(); }
  stopMusic(): void {
    const state = this.state();
    (state.stack.pop() ?? this.music)?.stop();
    this.music = undefined;
  }
  private music?: PreparedPlayback;

  async pushMusic(keyOrSource: string, options?: GameMusicOptions): Promise<PreparedPlayback> {
    const playback = await this.playMusic(keyOrSource, options);
    this.state().stack.push(playback);
    this.music = playback;
    return playback;
  }
  popMusic(): PreparedPlayback | undefined {
    const state = this.state();
    const current = state.stack.pop();
    current?.stop();
    const previous = state.stack.at(-1);
    previous?.start();
    this.music = previous;
    return previous;
  }

  async prepareSfx(key: string, source: string, options: GameSfxOptions = {}): Promise<PreparedSfx> {
    const audio = await this.audio();
    const prepared = await audio.prepareSfx(compile(source), options);
    this.state().sfx.set(key, prepared);
    return prepared;
  }
  async playSfx(key: string, options?: PlaySfxOptions): Promise<void> {
    const audio = await this.audio();
    const sfx = this.state().sfx.get(key);
    if (!sfx) throw new Error(`Unknown Synth8 SFX: ${key}`);
    audio.playSfx(sfx, options);
  }
  setMasterVolume(value: number): void { void this.audio().then((a) => a.setMasterVolume(value)); }
  setMusicVolume(value: number): void { void this.audio().then((a) => a.setMusicVolume(value)); }
  setSfxVolume(value: number): void { void this.audio().then((a) => a.setSfxVolume(value)); }
  setMusicDucking(value: number | MusicDuckingOptions): void { void this.audio().then((a) => a.setMusicDucking(value)); }
  duckMusic(amount = 0.5): void { this.setMusicDucking(amount); }
  unduckMusic(): void { this.setMusicDucking(1); }

  /** Play an already loaded Phaser audio key (optional Web Audio backend). */
  playBuffer(key: string, config?: Record<string, unknown>): unknown {
    return (this.scene as any).sound?.play?.(key, config);
  }

  shutdown(): void {
    // Scene shutdown must not stop the Game-owned music service. This is what
    // makes music continuous across scene changes and level transitions.
    this.playback?.stop();
    this.playback = undefined;
  }
  destroy(): void { this.shutdown(); super.destroy(); }
}
