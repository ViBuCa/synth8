const NOTE_RE = /^[a-gA-G](#|b)?[0-8]$/;

export const isSupportedNote = (value: string): boolean => {
    return value === "_" || NOTE_RE.test(value);
}