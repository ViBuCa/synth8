import type { BeatStep } from "../model/ast";

export const parseBeatPattern = (source: string): BeatStep[] => {
  let index = 0;

  const parseSteps = (until?: "]"): BeatStep[] => {
    const steps: BeatStep[] = [];

    while (index < source.length) {
      const char = source[index];

      if (/\s/.test(char)) {
        index++;
        continue;
      }

      if (until && char === until) {
        index++;
        return steps;
      }

      if (char === "[") {
        index++;
        steps.push({
          kind: "BeatGroup",
          steps: parseSteps("]"),
        });
        continue;
      }

      if (char === "]") {
        throw new Error("Unexpected closing group ']'.");
      }

      let value = "";

      while (
        index < source.length &&
        !/\s/.test(source[index]) &&
        source[index] !== "[" &&
        source[index] !== "]"
      ) {
        value += source[index];
        index++;
      }

      if (value.length > 0) {
        steps.push({
          kind: "BeatSound",
          value,
        });
      }
    }

    if (until) {
      throw new Error("Unterminated group '['.");
    }

    return steps;
  };

  return parseSteps();
};