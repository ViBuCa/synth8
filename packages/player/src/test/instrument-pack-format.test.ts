import { describe, expect, it } from "vitest";
import { decodeInstrumentPack, encodeInstrumentPack, type InstrumentPackData } from "../module";

const pack: InstrumentPackData = {
  version: 1,
  name: "Test pack",
  createdBy: "synth8",
  sampleRate: 22050,
  instruments: [{
    id: "inst-1-bass",
    name: "bass",
    playback: {
      oscillators: [
        { sound: "sawtooth", gain: 0.55 },
        { sound: "sine", transpose: -12, gain: 0.35 },
      ],
      effects: { distortion: 0.2, lowpass: 1200 },
    },
    range: { lowNote: 36, highNote: 48 },
    zones: [
      { sampleId: "inst-1-bass-n36", rootNote: 36, lowNote: 0, highNote: 42 },
      { sampleId: "inst-1-bass-n48", rootNote: 48, lowNote: 43, highNote: 127 },
    ],
  }],
  samples: [{
    id: "inst-1-bass-n36",
    name: "bass c2",
    pcm: new Int8Array([-128, 0, 127]),
    sampleRate: 22050,
    rootNote: 36,
    loop: { type: "none" },
  }],
};

describe("instrument pack format", () => {
  it("round-trips instrument descriptions and samples", () => {
    const decoded = decodeInstrumentPack(encodeInstrumentPack(pack));

    expect(decoded).toMatchObject({
      version: 1,
      name: "Test pack",
      createdBy: "synth8",
      instruments: [{
        id: "inst-1-bass",
        playback: {
          oscillators: [
            { sound: "sawtooth", gain: 0.55 },
            { sound: "sine", transpose: -12, gain: 0.35 },
          ],
        },
      }],
      samples: [{ id: "inst-1-bass-n36", rootNote: 36 }],
    });
    expect([...decoded.samples[0].pcm]).toEqual([-128, 0, 127]);
  });

  it("rejects unsupported payloads", () => {
    expect(() => decodeInstrumentPack(JSON.stringify({ version: 1, samples: [] }))).toThrow(
      "Unsupported Synth8 instrument pack format.",
    );
  });
});
