import { ImportedMidiSong } from "../model";
import { quantize } from "../utils";

export type MidiToSynth8Options = {
  step?: number; // seconds for now, e.g. 0.25
  track?: string;
};

export const midiToMelodySource = (
  song: ImportedMidiSong,
  options: MidiToSynth8Options = {}
): string => {
  const step = options.step ?? 0.25;

  const notes = options.track
    ? song.notes.filter((note) => note.track === options.track)
    : song.notes;

  const slots = new Map<number, string[]>();

  for (const note of notes) {
    const slot = Math.round(quantize(note.time, step) / step);
    const existing = slots.get(slot) ?? [];
    existing.push(note.name);
    slots.set(slot, existing);
  }

  const maxSlot = Math.max(...slots.keys());

  const parts: string[] = [];

  for (let slot = 0; slot <= maxSlot; slot++) {
    const values = slots.get(slot);

    if (!values || values.length === 0) {
      parts.push("_");
    } else {
      parts.push(values.join("+"));
    }
  }

  return `melody("${parts.join(" ")}")`;
}