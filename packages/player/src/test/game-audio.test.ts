import { afterEach, describe, expect, it, vi } from "vitest";
import { compile } from "@vibuca/synth8-core";
import { createGameAudio } from "../game-audio";
import type { InstrumentPackData } from "../module";

const audioParam = () => ({
  value: 0,
  setValueAtTime: vi.fn(),
  linearRampToValueAtTime: vi.fn(),
  exponentialRampToValueAtTime: vi.fn(),
  cancelScheduledValues: vi.fn(),
  setTargetAtTime: vi.fn(),
});

const makeContext = () => {
  const sources: Array<{ connect: ReturnType<typeof vi.fn>; start: ReturnType<typeof vi.fn> }> = [];
  const makeGain = () => ({ gain: audioParam(), connect: vi.fn(), disconnect: vi.fn() });
  const context = {
    currentTime: 0,
    sampleRate: 44100,
    destination: {},
    resume: vi.fn(async () => undefined),
    close: vi.fn(async () => undefined),
    createGain: makeGain,
    createBuffer: (_channels: number, length: number, sampleRate: number) => ({
      duration: length / sampleRate,
      sampleRate,
      getChannelData: () => new Float32Array(length),
    }),
    createBufferSource: () => {
      const source = {
        buffer: null as AudioBuffer | null,
        playbackRate: audioParam(),
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        disconnect: vi.fn(),
        addEventListener: vi.fn(),
      };
      sources.push(source);
      return source;
    },
    createStereoPanner: () => ({ pan: audioParam(), connect: vi.fn(), disconnect: vi.fn() }),
  } as unknown as AudioContext;
  return { context, sources };
};

afterEach(() => vi.unstubAllGlobals());

describe("game audio instrument packs", () => {
  it("routes named game music through the pre-rendered sample backend", async () => {
    const { context, sources } = makeContext();
    vi.stubGlobal("AudioContext", class { constructor() { return context; } });
    const pack: InstrumentPackData = {
      version: 1,
      createdBy: "synth8",
      sampleRate: 22050,
      instruments: [{
        id: "inst-bass",
        name: "game bass",
        kind: "note",
        playback: { instrument: "game bass" },
        zones: [{ sampleId: "game-bass-c4", rootNote: 60, lowNote: 0, highNote: 127 }],
      }],
      samples: [{ id: "game-bass-c4", pcm: new Int8Array([0, 64, 0, -64]), sampleRate: 22050, rootNote: 60 }],
    };
    const pattern = compile(`instruments(instrument("game bass").sound("sine"), song(melody("c4").instrument("game bass")))`);
    const audio = await createGameAudio();
    const playback = await audio.prepareMusic(pattern, { instrumentPack: pack, bpm: 120 });

    await playback.start();

    expect(sources).toHaveLength(1);
    expect(sources[0].connect).toHaveBeenCalled();
    expect(sources[0].start).toHaveBeenCalledOnce();
    playback.stop();
    audio.dispose();
  });
});
