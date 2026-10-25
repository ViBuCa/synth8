import { describe, expect, it } from "vitest";
import { encodeSampleWav } from "../module";

describe("sample WAV export", () => {
  it("writes a mono PCM WAV from portable sample data", async () => {
    const blob = encodeSampleWav({ id: "test", pcm: new Int8Array([-128, 0, 127]), sampleRate: 8363 });
    const bytes = new Uint8Array(await blob.arrayBuffer());
    expect(new TextDecoder().decode(bytes.subarray(0, 4))).toBe("RIFF");
    expect(new TextDecoder().decode(bytes.subarray(8, 12))).toBe("WAVE");
    expect(bytes.length).toBe(50);
  });
});
