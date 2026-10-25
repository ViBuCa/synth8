import type { ModuleMetadata } from "./index";
import { detectModuleFormat } from "./decoder";

const ascii = (data: Uint8Array): string => new TextDecoder("ascii").decode(data);

/** Inspect supported and recognized module headers without attempting playback. */
export const inspectModule = (data: Uint8Array): ModuleMetadata => {
  const content = ascii(data);
  const format = detectModuleFormat(data);
  const result: ModuleMetadata = { format, byteLength: data.byteLength };
  if (format === "mod") {
    result.title = new TextDecoder("ascii").decode(data.subarray(0, 20)).replace(/\0+$/, "").trimEnd() || undefined;
    const signature = new TextDecoder("ascii").decode(data.subarray(1080, 1084));
    if (/^\dCHN$/.test(signature)) result.channels = Number(signature[0]);
    else if (/^\d{2}CH$/.test(signature)) result.channels = Number(signature.slice(0, 2));
    else if (signature === "6CHN") result.channels = 6;
    else if (signature === "8CHN" || signature === "FLT8" || signature === "OKTA" || signature === "CD81") result.channels = 8;
    else result.channels = 4;
  }
  if (format === "tfmx" || format === "tfhd") {
    result.title = format === "tfmx" ? "TFMX module" : "TFHD module";
    const date = /Date\s*:\s*([^\r\n]+?)(?=\s{2,}Time|\s*$)/.exec(content)?.[1]?.trim();
    const time = /Time\s*:\s*([^\r\n]+)/.exec(content)?.[1]?.trim();
    if (date) result.date = date;
    if (time) result.time = time;
  }
  return result;
};
