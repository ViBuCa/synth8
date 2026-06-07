import type { BeatSound, BeatStep } from "../model/ast";
import { parsePatternToken } from "./pattern-token";

const toBeatSound = (value: string): BeatSound => {
    const token = parsePatternToken(value);

    return {
        kind: "BeatSound",
        value: token.value,
        velocity: token.velocity,
    };
};


const toBeatStep = (value: string): BeatStep => {
    const parts = value.split("+").filter(Boolean);

    if (parts.length === 1) {
        return toBeatSound(parts[0]);
    }

    return {
        kind: "BeatParallel",
        sounds: parts.map(toBeatSound),
    };
};

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
                steps.push(toBeatStep(value));
            }
        }

        if (until) {
            throw new Error("Unterminated group '['.");
        }

        return steps;
    };

    return parseSteps();
};