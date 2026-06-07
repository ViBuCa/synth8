const NOTE_TO_SEMITONE: Record<string, number> = {
    c: 0,
    "c#": 1,
    db: 1,
    d: 2,
    "d#": 3,
    eb: 3,
    e: 4,
    f: 5,
    "f#": 6,
    gb: 6,
    g: 7,
    "g#": 8,
    ab: 8,
    a: 9,
    "a#": 10,
    bb: 10,
    b: 11,
};

const SEMITONE_TO_NOTE = [
    "c",
    "c#",
    "d",
    "d#",
    "e",
    "f",
    "f#",
    "g",
    "g#",
    "a",
    "a#",
    "b",
];

export const transposeNote = (note: string, semitones: number): string => {
    if (note === "_") return note;

    const match = /^([a-gA-G](?:#|b)?)([0-8])$/.exec(note);

    if (!match) {
        throw new Error(`Invalid note: ${note}`);
    }

    const pitch = match[1].toLowerCase();
    const octave = Number(match[2]);

    const absolute = octave * 12 + NOTE_TO_SEMITONE[pitch];
    const transposed = absolute + semitones;

    if (transposed < 0) {
        throw new Error(`Transposed note is below supported range: ${note}`);
    }

    const newOctave = Math.floor(transposed / 12);
    const newPitch = SEMITONE_TO_NOTE[transposed % 12];

    if (newOctave > 8) {
        throw new Error(`Transposed note is above supported range: ${note}`);
    }

    return `${newPitch}${newOctave}`;
};