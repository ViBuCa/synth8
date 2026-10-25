import { describe, expect, it } from "vitest";
import { decodeModule, decodeModuleAsync, detectModuleFormat, inspectModule, registerModuleDecoder } from "../module";

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

const makeLegacy15Mod = (): Uint8Array => {
  const data = new Uint8Array(600 + 1024 + 2);
  putText(data, 0, "Legacy 15 sample MOD");
  putText(data, 20, "Legacy sample");
  putU16(data, 42, 1);
  data[45] = 64;
  data[470] = 1;
  data[472] = 0;
  data[600] = 1;
  data[601] = 0xac;
  data[602] = 0x10;
  data[603] = 0;
  data[1624] = 64;
  data[1625] = 0;
  return data;
};

describe("decoder registry", () => {
  it("allows optional format adapters without separate player packages", () => {
    const decoder = {
      format: "tfmx" as const,
      canDecode: (data: Uint8Array) => data[0] === 0xaa,
      decode: () => ({ format: "tfmx" as const, orders: [], patterns: [], samples: [], instruments: [], initialSpeed: 6, initialTempo: 125 }),
    };
    const unregister = registerModuleDecoder(decoder);
    expect(decodeModule(new Uint8Array([0xaa]))).toMatchObject({ format: "tfmx" });
    unregister();
  });

  it("supports asynchronous decoder initialization", async () => {
    const decoder = {
      format: "tfhd" as const,
      canDecode: (data: Uint8Array) => data[0] === 0xbb,
      decode: async () => ({ format: "tfhd" as const, orders: [], patterns: [], samples: [], instruments: [], initialSpeed: 6, initialTempo: 125 }),
    };
    const unregister = registerModuleDecoder(decoder);
    await expect(decodeModuleAsync(new Uint8Array([0xbb]))).resolves.toMatchObject({ format: "tfhd" });
    expect(() => decodeModule(new Uint8Array([0xbb]))).toThrow(/decodeModuleAsync/);
    unregister();
  });
});

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

describe("module format detection", () => {
  it("identifies TFMX and TFHD for a future specialized backend", () => {
    expect(detectModuleFormat(new TextEncoder().encode("TFMX-MOD"))).toBe("tfmx");
    expect(detectModuleFormat(new TextEncoder().encode("TFHD"))).toBe("tfhd");
    expect(inspectModule(new TextEncoder().encode("TFMX-MOD Date : 23.01.91  Time : 17:56"))).toMatchObject({ format: "tfmx", date: "23.01.91", time: "17:56" });
  });
});

describe("MOD channel signatures", () => {
  it("recognizes multi-digit channel signatures", () => {
    const data = new Uint8Array(1084);
    putText(data, 1080, "12CH");
    expect(detectModuleFormat(data)).toBe("mod");
  });
});

describe("legacy 15-sample MOD decoder", () => {
  it("detects the headerless 15-sample layout", () => {
    const module = decodeModule(makeLegacy15Mod());
    expect(module.format).toBe("mod");
    expect(module.samples).toHaveLength(15);
    expect(module.patterns[0].rows[0].cells[0]).toMatchObject({ note: 48, instrument: 1 });
  });
});
