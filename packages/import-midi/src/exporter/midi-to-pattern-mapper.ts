import { ImportedMidiSong, MidiToSynth8Options, SlotNote } from "../model";
import { noteToToken, quantize, resolveQuantizationStep } from "../utils";
import { compressSustainRests } from "./sustain-helper";

const formatRate = (rate: number): string => {
    return Number.isInteger(rate)
        ? String(rate)
        : Number(rate.toFixed(6)).toString();
};

const rateSuffix = (step: number): string => {
    if (step === 1) {
        return "";
    }

    if (step < 1) {
        return `.fast(${formatRate(1 / step)})`;
    }

    return `.slow(${formatRate(step)})`;
};

export const midiToPatternSource = (
    song: ImportedMidiSong,
    options: MidiToSynth8Options = {},
    wrapper: "melody" | "beat"
): string => {
    const notes = options.track
        ? song.notes.filter((note) => note.track === options.track)
        : song.notes;

    if (notes.length === 0) {
        return `${wrapper}("_")`;
    }

    const step = resolveQuantizationStep(notes, options.step);
    const slots = new Map<number, SlotNote[]>();

    for (const note of notes) {
        const slot = Math.round(quantize(note.time, step) / step);
        const existing = slots.get(slot) ?? [];

        existing.push({
            midi: note.midi,
            token: noteToToken(note, step, options.includeVelocity ?? false),
        });

        slots.set(slot, existing);
    }

    const maxSlot = Math.max(...slots.keys());
    const parts: string[] = [];

    for (let slot = 0; slot <= maxSlot; slot++) {
        const values = slots.get(slot);

        if (!values || values.length === 0) {
            parts.push("_");
        } else {
            parts.push(
                values
                    .toSorted((a, b) => a.midi - b.midi)
                    .map((note) => note.token)
                    .join("+")
            );
        }
    }
    const finalParts =
        options.compressSustains === false ? parts : compressSustainRests(parts);

    return `${wrapper}("${finalParts.join(" ")}")${rateSuffix(step)}`;
}
