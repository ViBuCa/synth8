import { describe, expect, it } from "vitest";
import { decodeModule, detectModuleFormat } from "../module";

const putText = (data: Uint8Array, offset: number, value: string): void => {
  data.set(new TextEncoder().encode(value), offset);
};

const putU16 = (data: Uint8Array, offset: number, value: number): void => {
  data[offset] = value >> 8;
  data[offset + 1] = value & 0xff;
};

const makeMod = (): Uint8Array => {
  const data = new Uint8Array(1084 + 1024 + 4);
  putText(data, 0, "Test MOD");
  putText(data, 20, "C3 sample");
  putU16(data, 20 + 22, 2);
  data[20 + 25] = 64;
  data[950] = 1;
  data[952] = 0;
  putText(data, 1080, "M.K.");
  // Row 0 / channel 0: instrument 1, C-3 (period 428).
  data[1084] = 1;
  data[1085] = 428 & 0xff;
  data[1086] = 0x10;
  data[1087] = 0;
  data[2108] = 0x80;
  data[2109] = 0x7f;
  data[2110] = 0;
  data[2111] = 0xff;
  return data;
};

describe("MOD decoder", () => {
  it("detects and decodes a ProTracker module", () => {
    const data = makeMod();
    expect(detectModuleFormat(data)).toBe("mod");
    const module = decodeModule(data);
    expect(module.title).toBe("Test MOD");
    expect(module.channels).toBe(4);
    expect(module.orders).toEqual([0]);
    expect(module.patterns[0].rows[0].cells[0]).toMatchObject({ note: 48, instrument: 1 });
    expect(module.samples[0]).toMatchObject({ name: "C3 sample", length: 4, volume: 1 });
    expect([...(module.samples[0].data ?? [])]).toEqual([-128, 127, 0, -1]);
  });
});
