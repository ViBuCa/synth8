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

  it("keeps rendered playback position synchronized at multiple BPM values", async () => {
    for (const bpm of [30, 60, 90, 120]) {
      const context = { currentTime: 0, destination: {}, createGain: () => ({ gain: { value: 0, setTargetAtTime: vi.fn() }, connect: vi.fn(), disconnect: vi.fn() }), createBufferSource: () => ({ connect: vi.fn(), start: vi.fn(), stop: vi.fn(), disconnect: vi.fn() }), resume: vi.fn(async () => undefined) } as unknown as AudioContext;
      const duration = 16 * 60 / bpm;
      const playback = createNativeBufferPlayback({ context, buffer: { duration } as AudioBuffer, loop: false, loopEnd: duration });
      playback.start();
      await playback.ready;
      context.currentTime = duration * 0.5;
      expect(playback.getPosition?.()).toBeCloseTo(duration * 0.5, 6);
      context.currentTime = duration;
      expect(playback.getPosition?.()).toBeCloseTo(duration, 6);
    }
  });

  it("preserves the exact audio position across pause and resume", async () => {
    const context = { currentTime: 0, destination: {}, createGain: () => ({ gain: { value: 0, setTargetAtTime: vi.fn() }, connect: vi.fn(), disconnect: vi.fn() }), createBufferSource: () => ({ connect: vi.fn(), start: vi.fn(), stop: vi.fn(), disconnect: vi.fn() }), resume: vi.fn(async () => undefined) } as unknown as AudioContext;
    const playback = createNativeBufferPlayback({ context, buffer: { duration: 10 } as AudioBuffer, loop: false, loopEnd: 10 });
    playback.start();
    await playback.ready;
    context.currentTime = 3.25;
    playback.pause();
    expect(playback.getPosition?.()).toBeCloseTo(3.25, 6);
    context.currentTime = 20;
    playback.resume();
    context.currentTime = 21.5;
    expect(playback.getPosition?.()).toBeCloseTo(4.75, 6);
  });

  it("does not repeat non-looping playback after its pattern duration", () => {
    const event = { kind: "note", time: 3, duration: 1, pitch: "c4", velocity: 1 } as Synth8Event;
    const clock = { currentTime: 0 };
    const batches: Synth8Event[][] = [];
    const backend = { start: vi.fn(), schedule: vi.fn((events: Synth8Event[]) => batches.push(events)), stop: vi.fn() };
    const scheduler = new BackendScheduler(pattern([event], 4), backend, clock, { bpm: 30, lookAhead: 0.5 });
    scheduler.start();
    expect(batches.flat()).toHaveLength(0);
    scheduler.stop();
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
