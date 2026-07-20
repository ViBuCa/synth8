import type { MelodyNote, MelodyStep } from "../model/ast";
import { isSupportedNote } from "./notes";
import { parsePatternToken } from "./pattern-token";

const toMelodyNote = (value: string): MelodyNote => {
    const token = parsePatternToken(value);

    return {
        kind: "MelodyNote",
        value: token.value,
        velocity: token.velocity,
        duration: token.duration
    };
};

const splitParallelParts = (value: string): string[] => {
    const parts = value.split("+");

    if (parts.length === 0 || parts.some((part) => part.length === 0)) {
        throw new Error(`Invalid parallel melody token: ${value}`);
    }

    return parts;
};

const toMelodyStep = (value: string): MelodyStep => {
    const parts = splitParallelParts(value);

    if (parts.length === 1) {
        return toMelodyNote(parts[0]);
    }

    return {
        kind: "MelodyParallel",
        notes: parts.map(toMelodyNote),
    };
};

const validateMelodyToken = (value: string): void => {
    const parts = splitParallelParts(value);

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
        while (/\s/.test(chars[index] ?? "")) index++;
    };

    const parseSteps = (until?: string): MelodyStep[] => {
        const notes: MelodyStep[] = [];

        while (index < chars.length) {
            skipWhitespace();

            if (until && chars[index] === until) {
                index++;
                return notes;
            }

            if (chars[index] === "]") {
                throw new Error("Unexpected closing group ']'.");
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
                !/\s/.test(chars[index]) &&
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