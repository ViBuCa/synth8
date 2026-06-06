import type { MelodyStep } from "../model/ast";
import { isSupportedNote } from "./notes";

export function parseMelodyPattern(source: string): MelodyStep[] {
    const chars = [...source];
    let index = 0;

    function skipWhitespace() {
        while (chars[index] === " ") index++;
    }

    function parseSteps(until?: string): MelodyStep[] {
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

            if (!isSupportedNote(value)) {
                throw new Error(`Unknown note: ${value}`);
            }

            notes.push({
                kind: "MelodyNote",
                value,
            });
        }

        if (until) {
            throw new Error("Unclosed melody group");
        }

        return notes;
    }

    return parseSteps();
}