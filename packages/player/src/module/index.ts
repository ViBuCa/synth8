export * from "./sample-bank";

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
};
