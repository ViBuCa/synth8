import { ImportedMidiNote } from "../model";
import { durationSuffix } from "./duration-suffix";
import { formatVelocity } from "./velocity-formatter";

export const noteToToken = (note: ImportedMidiNote, step: number, includeVelocity: boolean): string => {
    const value = note.kind === "drum" && note.drum ? note.drum : note.name;

    const velocitySuffix = includeVelocity
        ? `:${formatVelocity(note.velocity)}`
        : "";

    return `${value}${durationSuffix(note.dur, step)}${velocitySuffix}`;
}