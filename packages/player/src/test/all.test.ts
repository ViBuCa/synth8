import { describe, expect, it, vi } from "vitest";
import type { Pattern, Synth8Event } from "@vibuca/synth8-core";
import { resolvePlaybackPreset } from "../playback/presets";
import { BackendScheduler } from "../playback/backend-scheduler";
import { encodeWav } from "../playback/render";
import { createNativeBufferPlayback } from "../backend/native-buffer";

const pattern = (events: Synth8Event[], length = 4): Pattern => ({
  length,
  events,
  query: (start, end) => events.filter((event) => event.time >= start && event.time < end),
} as Pattern);

describe("native player", () => {
  it("resolves playback presets without an audio engine", () => {
    expect(resolvePlaybackPreset({ sound: "square" })).toMatchObject({ sound: "square" });
    expect(resolvePlaybackPreset({ preset: "chip-bass" })).toBeTruthy();
  });

  it("schedules queried events in beat time", () => {
    const event = { kind: "note", time: 0, duration: 1, pitch: "c4", velocity: 1 } as Synth8Event;
    const clock = { currentTime: 0 };
    const batches: Synth8Event[][] = [];
    const backend = { start: vi.fn(), schedule: vi.fn((events: Synth8Event[]) => batches.push(events)), stop: vi.fn() };
    const scheduler = new BackendScheduler(pattern([event]), backend, clock, { bpm: 120, lookAhead: 0.5 });

    scheduler.start();

    expect(backend.start).toHaveBeenCalledOnce();
    expect(batches).toHaveLength(1);
    expect(batches[0][0]).toMatchObject({ time: 0, pitch: "c4" });
    scheduler.stop();
    expect(backend.stop).toHaveBeenCalledOnce();
  });

  it("encodes PCM audio as a WAV blob", async () => {
    const audio = {
      numberOfChannels: 1,
      sampleRate: 8000,
      length: 2,
      getChannelData: () => new Float32Array([-1, 1]),
    } as AudioBuffer;
    const blob = encodeWav(audio);
    expect(blob.type).toBe("audio/wav");
    expect(blob.size).toBe(48);
    expect(new Uint8Array(await blob.arrayBuffer()).slice(0, 4)).toEqual(new Uint8Array([82, 73, 70, 70]));
  });

  it("controls a native looping buffer source", () => {
    const source = { connect: vi.fn(), start: vi.fn(), stop: vi.fn(), disconnect: vi.fn() };
    const gain = { gain: { value: 0 }, connect: vi.fn(), disconnect: vi.fn() };
    const context = {
      currentTime: 0,
      destination: {},
      createGain: () => gain,
      createBufferSource: () => ({ ...source }),
      resume: vi.fn(async () => undefined),
    } as unknown as AudioContext;
    const buffer = { duration: 2 } as AudioBuffer;
    const playback = createNativeBufferPlayback({ context, buffer, loop: true, loopEnd: 2 });

    playback.start();
    expect(source.start).toHaveBeenCalledOnce();
    playback.pause();
    playback.resume();
    playback.stop();
    playback.dispose();
    expect(source.stop).toHaveBeenCalled();
    expect(gain.disconnect).toHaveBeenCalled();
  });
});
