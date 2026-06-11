import { ImportedMidiNote } from "../model";

const DEFAULT_STEP = 0.25;
const EPSILON = 1e-9;

const CANDIDATE_STEPS = [
    1,
    0.5,
    1 / 3,
    0.25,
    1 / 6,
    0.125,
    1 / 12,
    0.0625,
    1 / 24,
];

export const quantize = (value: number, step: number): number => {
    return Math.round(value / step) * step;
}

const quantizationError = (value: number, step: number): number => {
    return Math.abs(value - quantize(value, step));
};

const preservesDistinctOnsets = (
    notes: ImportedMidiNote[],
    step: number
): boolean => {
    const slotsByTrack = new Map<string, Set<number>>();

    for (const note of notes) {
        let slots = slotsByTrack.get(note.track);

        if (!slots) {
            slots = new Set();
            slotsByTrack.set(note.track, slots);
        }

        const slot = Math.round(quantize(note.time, step) / step);

        if (slots.has(slot)) {
            const hasOriginalCollision = notes.some((other) =>
                other !== note &&
                other.track === note.track &&
                Math.abs(other.time - note.time) < EPSILON
            );

            if (!hasOriginalCollision) {
                return false;
            }
        }

        slots.add(slot);
    }

    return true;
};

export const inferQuantizationStep = (
    notes: ImportedMidiNote[],
    fallbackStep = DEFAULT_STEP
): number => {
    if (notes.length === 0) {
        return fallbackStep;
    }

    const values = notes.flatMap((note) => [note.time, note.dur]);
    const tolerance = fallbackStep / 5;

    for (const step of CANDIDATE_STEPS) {
        const matchesGrid = values.every((value) =>
            quantizationError(value, step) <= tolerance
        );

        if (matchesGrid && preservesDistinctOnsets(notes, step)) {
            return step;
        }
    }

    return fallbackStep;
};

export const resolveQuantizationStep = (
    notes: ImportedMidiNote[],
    step: number | "auto" | undefined
): number => {
    if (typeof step === "number") {
        return step;
    }

    return inferQuantizationStep(notes);
};
