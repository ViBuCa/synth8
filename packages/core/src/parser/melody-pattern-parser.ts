import type { MelodyStep } from "../model/ast";
import { isSupportedNote } from "./notes";

const toMelodyStep = (value: string): MelodyStep => {
    const parts = value.split("+").filter(Boolean);

    if (parts.length === 1) {
        return {
            kind: "MelodyNote",
            value: parts[0],
        };
    }

    return {
        kind: "MelodyParallel",
        notes: parts.map((part) => ({
            kind: "MelodyNote",
            value: part,
        })),
    };
};

const validateMelodyToken = (value: string): void => {
    const parts = value.split("+").filter(Boolean);

    if (parts.length === 0) {
        throw new Error("Expected note.");
    }

    for (const part of parts) {
        if (!isSupportedNote(part)) {
            throw new Error(`Unknown note: ${part}`);
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