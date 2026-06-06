import type { Pattern } from "../model/pattern";

const VALID_DRUMS = new Set(["kick", "snare", "hihat"]);

export const compile = (source: string): Pattern => {
  const match = source.match(
    /^beat\("([^"]*)"\)(?:\.rate\((\d+(?:\.\d+)?)\))?$/
  );

  if (!match) {
    throw new Error(
      `Invalid Synt8 pattern. Expected: beat("kick snare hihat hihat").rate(2)`
    );
  }

  const [, body, rateRaw] = match;
  const rate = rateRaw ? Number(rateRaw) : 1;

  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error(`Invalid rate: ${rateRaw}`);
  }

  const tokens = body.trim().split(/\s+/).filter(Boolean);

  if (tokens.length === 0) {
    return { length: 0, events: [] };
  }

  for (const token of tokens) {
    if (!VALID_DRUMS.has(token)) {
      throw new Error(`Unknown drum sound: ${token}`);
    }
  }

  const dur = 1 / rate;

  return {
    length: tokens.length * dur,
    events: tokens.map((token, index) => ({
      time: index * dur,
      dur,
      type: "drum",
      value: token,
    })),
  };
};