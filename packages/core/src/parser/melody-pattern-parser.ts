import type { MelodyNote, MelodyStep } from "../model/ast";
import { isSupportedNote } from "./notes";
import { parsePatternToken } from "./pattern-token";

const toMelodyNote = (value: string): MelodyNote => {
    const token = parsePatternToken(value);

    return {
        kind: "MelodyNote",
        value: token.value,
        velocity: token.velocity,
        duration: 1
    };
};

const toMelodyStep = (value: string): MelodyStep => {
    const parts = value.split("+").filter(Boolean);

    if (parts.length === 1) {
        return toMelodyNote(parts[0]);
    }

    return {
        kind: "MelodyParallel",
        notes: parts.map(toMelodyNote),
    };
};

const validateMelodyToken = (value: string): void => {
    const parts = value.split("+").filter(Boolean);

    if (parts.length === 0) {
        throw new Error("Expected note.");
    }

    for (const part of parts) {
        const token = parsePatternToken(part);
        if (!isSupportedNote(token.value)) {
            throw new Error(`Unknown note: ${token.value}`);
        }
    }
};

export const parseMelodyPattern = (source: string): MelodyStep[] => {
    const chars = [...source];
    let index = 0;

    const skipWhitespace = () => {
        while (chars[index] === " ") index++;
    };

    const parseSteps = (until?: string): MelodyStep[] => {
        const notes: MelodyStep[] = [];

        while (index < chars.length) {
            skipWhitespace();

            if (until && chars[index] === until) {
                index++;
                return notes;
            }

            if (chars[index] === "[") {
                index++;
                notes.push({
                    kind: "MelodyGroup",
                    notes: parseSteps("]"),
                });
                continue;
            }

            let value = "";

            while (
                index < chars.length &&
                chars[index] !== " " &&
                chars[index] !== "[" &&
                chars[index] !== "]"
            ) {
                value += chars[index++];
            }

            if (!value) break;

            validateMelodyToken(value);
            notes.push(toMelodyStep(value));
        }

        if (until) {
            throw new Error("Unclosed melody group");
        }

        return notes;
    }

    return parseSteps();
}