import type { ModuleFormat, TrackerModule } from "./index";

export type ModuleDecoder = {
  format: ModuleFormat;
  canDecode(data: Uint8Array): boolean;
  decode(data: Uint8Array): TrackerModule | Promise<TrackerModule>;
};

const text = (data: Uint8Array, start: number, length: number): string =>
  new TextDecoder("ascii").decode(data.subarray(start, start + length)).replace(/\0+$/, "").trimEnd();

const signatures = new Set(["M.K.", "M!K!", "M&K!", "N.T.", "FLT4", "FLT8", "4CHN", "6CHN", "8CHN", "OKTA", "CD81"]);

const isModSignature = (signature: string): boolean =>
  signatures.has(signature) || /^\dCHN$/.test(signature) || /^\d{2}CH$/.test(signature);

const isLegacy15Mod = (data: Uint8Array): boolean =>
  data.length >= 600 &&
  (data[470] ?? 0) > 0 && (data[470] ?? 0) <= 128 &&
  (data[472] ?? 0) < 64;

export const detectModuleFormat = (data: Uint8Array): ModuleFormat => {
  const magic = text(data, 0, 8);
  if (magic.startsWith("TFMX-MOD")) return "tfmx";
  if (text(data, 0, 4) === "TFHD") return "tfhd";
  if (data.length >= 1084 && isModSignature(text(data, 1080, 4))) return "mod";
  if (isLegacy15Mod(data)) return "mod";
  return "unknown";
};

const registeredDecoders: ModuleDecoder[] = [];

/** Register an optional format decoder, such as a WASM-backed TFMX adapter. */
export const registerModuleDecoder = (decoder: ModuleDecoder): (() => void) => {
  if (!registeredDecoders.includes(decoder)) registeredDecoders.push(decoder);
  return () => {
    const index = registeredDecoders.indexOf(decoder);
    if (index >= 0) registeredDecoders.splice(index, 1);
  };
};

export const getModuleDecoders = (): readonly ModuleDecoder[] => [modDecoder, ...registeredDecoders];

const findDecoder = (data: Uint8Array, decoders: readonly ModuleDecoder[]): ModuleDecoder => {
  const decoder = decoders.find((candidate) => candidate.canDecode(data));
  if (decoder) return decoder;
  const format = detectModuleFormat(data);
  if (format === "tfmx" || format === "tfhd") {
    throw new Error(`${format.toUpperCase()} module recognized, but its specialized replay backend is not available yet.`);
  }
  throw new Error(`Unsupported module format: ${format}`);
};

export const decodeModule = (data: Uint8Array, decoders: readonly ModuleDecoder[] = getModuleDecoders()): TrackerModule => {
  const result = findDecoder(data, decoders).decode(data);
  if (result instanceof Promise) throw new Error("This module decoder is asynchronous; use decodeModuleAsync().");
  return result;
};

export const decodeModuleAsync = async (
  data: Uint8Array,
  decoders: readonly ModuleDecoder[] = getModuleDecoders(),
): Promise<TrackerModule> => findDecoder(data, decoders).decode(data);

const readU16 = (data: Uint8Array, offset: number): number =>
  ((data[offset] ?? 0) << 8) | (data[offset + 1] ?? 0);

const readI8 = (value: number): number => value > 127 ? value - 256 : value;

const bcd = (value: number): number => ((value >> 4) * 10) + (value & 0x0f);

// Periods from C-3 through B-5 used by ProTracker-compatible modules.
const PERIODS = [
  1712, 1616, 1524, 1440, 1356, 1280, 1208, 1140, 1076, 1016, 960, 906,
  856, 808, 762, 720, 678, 640, 604, 570, 538, 508, 480, 453,
  428, 404, 381, 360, 339, 320, 302, 285, 269, 254, 240, 226,
];

const periodToMidi = (period: number): number | undefined => {
  if (!period) return undefined;
  let best = 0;
  let distance = Number.POSITIVE_INFINITY;
  for (let index = 0; index < PERIODS.length; index += 1) {
    const candidate = Math.abs(PERIODS[index] - period);
    if (candidate < distance) {
      distance = candidate;
      best = index;
    }
  }
  // ProTracker's first period is conventionally C-1; map it to MIDI C1.
  return 24 + best;
};

const effect = (command: number, value: number) => {
  switch (command) {
    case 0x0: return value === 0 ? undefined : { type: "arpeggio" as const, x: value >> 4, y: value & 0x0f };
    case 0x1: return { type: "pitch-slide-up" as const, amount: value };
    case 0x2: return { type: "pitch-slide-down" as const, amount: value };
    case 0x3: return { type: "portamento" as const, amount: value };
    case 0x4: return { type: "vibrato" as const, speed: value >> 4, depth: value & 0x0f };
    case 0x9: return { type: "sample-offset" as const, offset: value * 256 };
    case 0xa: return { type: "volume-slide" as const, amount: value };
    case 0xb: return { type: "pattern-jump" as const, order: value };
    case 0xd: return { type: "pattern-break" as const, row: bcd(value) };
    case 0xf: return value <= 0x1f
      ? { type: "set-speed" as const, speed: value }
      : { type: "set-tempo" as const, bpm: value };
    case 0xe: {
      const subcommand = value >> 4;
      const subvalue = value & 0x0f;
      if (subcommand === 0xc) return { type: "note-cut" as const, tick: subvalue };
      if (subcommand === 0xd) return { type: "note-delay" as const, tick: subvalue };
      return { type: "unknown" as const, command: `E${subcommand.toString(16)}`, value: subvalue };
    }
    default: return command === 0 ? undefined : { type: "unknown" as const, command: command.toString(16), value };
  }
};

const channelsFor = (signature: string): number => {
  if (signature === "OKTA" || signature === "CD81" || signature === "FLT8") return 8;
  if (/^\dCHN$/.test(signature)) return Number(signature[0]);
  if (/^\d{2}CH$/.test(signature)) return Number(signature.slice(0, 2));
  return 4;
};

export const modDecoder: ModuleDecoder = {
  format: "mod",
  canDecode(data) { return detectModuleFormat(data) === "mod"; },
  decode(data) {
    if (!this.canDecode(data)) throw new Error("Not a supported ProTracker MOD file.");
    const legacy15 = isLegacy15Mod(data);
    const signature = legacy15 ? "M.K." : text(data, 1080, 4);
    const channels = channelsFor(signature);
    const title = text(data, 0, 20);
    const sampleCount = legacy15 ? 15 : 31;
    const songLengthOffset = legacy15 ? 470 : 950;
    const orderTableOffset = legacy15 ? 472 : 952;
    const headerEnd = legacy15 ? 600 : 1084;
    const songLength = Math.min(data[songLengthOffset] ?? 0, 128);
    const restartOrder = data[songLengthOffset + 1] ?? 0;
    const orderTable = Array.from(data.subarray(orderTableOffset, orderTableOffset + 128));
    const orders = orderTable.slice(0, songLength);
    const patternCount = Math.max(0, ...orders) + 1;
    const patternDataStart = headerEnd;
    const patternSize = 64 * channels * 4;
    const patterns = [];
    for (let patternIndex = 0; patternIndex < patternCount; patternIndex += 1) {
      const rows = [];
      const patternStart = patternDataStart + patternIndex * patternSize;
      for (let rowIndex = 0; rowIndex < 64; rowIndex += 1) {
        const cells = [];
        for (let channel = 0; channel < channels; channel += 1) {
          const offset = patternStart + (rowIndex * channels + channel) * 4;
          const first = data[offset] ?? 0;
          const second = data[offset + 1] ?? 0;
          const third = data[offset + 2] ?? 0;
          const fourth = data[offset + 3] ?? 0;
          const period = ((first & 0x0f) << 8) | second;
          const instrument = (first & 0xf0) | (third >> 4);
          const command = third & 0x0f;
          const value = fourth;
          const parsedEffect = effect(command, value);
          cells.push({
            ...(periodToMidi(period) === undefined ? {} : { note: periodToMidi(period) }),
            ...(instrument ? { instrument } : {}),
            ...(command === 0xc ? { volume: Math.min(64, value) / 64 } : {}),
            ...(parsedEffect ? { effect: parsedEffect } : {}),
          });
        }
        rows.push({ cells });
      }
      patterns.push({ index: patternIndex, rows });
    }

    const samples = [];
    let sampleOffset = patternDataStart + patternCount * patternSize;
    for (let index = 0; index < sampleCount; index += 1) {
      const header = 20 + index * 30;
      const length = readU16(data, header + 22) * 2;
      const volume = Math.min(64, data[header + 25] ?? 0) / 64;
      const loopStart = readU16(data, header + 26) * 2;
      const loopLength = readU16(data, header + 28) * 2;
      const sampleData = data.slice(sampleOffset, sampleOffset + length);
      samples.push({
        index: index + 1,
        name: text(data, header, 22),
        assetId: `mod-sample-${index + 1}`,
        rootNote: 48,
        volume,
        length,
        ...(loopLength >= 4 ? { loopStart, loopEnd: loopStart + loopLength } : {}),
        data: new Int8Array(sampleData.buffer, sampleData.byteOffset, sampleData.byteLength),
      });
      sampleOffset += length;
    }

    return {
      format: "mod",
      title: title || undefined,
      channels,
      orders,
      patterns,
      samples,
      instruments: samples.map((sample) => ({ index: sample.index, name: sample.name, sampleIndexes: [sample.index] })),
      initialSpeed: 6,
      initialTempo: 125,
      restartOrder,
    };
  },
};
