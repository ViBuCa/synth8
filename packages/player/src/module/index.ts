export * from "./sample-bank";
export * from "./sample-player";
export * from "./sample-wav";
export * from "./sample-bank-format";
export * from "./tfmx-samples";
export * from "./tracker-model";
export * from "./tracker-clock";
export * from "./decoder";
export * from "./tracker-playback";
export * from "./inspect";

/**
 * Format-neutral module status. Decoder and tracker-player APIs will be added
 * here without creating separate npm packages for each file format.
 */
export type ModuleFormat = "mod" | "xm" | "s3m" | "it" | "tfmx" | "tfhd" | "unknown";

export type ModuleMetadata = {
  format: ModuleFormat;
  title?: string;
  channels?: number;
  duration?: number;
  date?: string;
  time?: string;
  byteLength?: number;
};
