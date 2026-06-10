import { ImportedMidiSong } from "../model";

export const getOrderedTracks = (song: ImportedMidiSong, trackOrder: string[] = []): string[] => {
  const tracks = [...new Set(song.notes.map((note) => note.track))];

  return tracks.toSorted((a, b) => {
    const ai = trackOrder.indexOf(a);
    const bi = trackOrder.indexOf(b);

    if (ai !== -1 && bi !== -1) {
      return ai - bi;
    }

    if (ai !== -1) return -1;
    if (bi !== -1) return 1;

    return a.localeCompare(b);
  });
}