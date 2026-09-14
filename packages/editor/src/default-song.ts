/** Default editor sketch: Bach, Invention No. 1 in C major, BWV 772. */
export const DEFAULT_SONG_SOURCE = `// synth8-bpm: 90
// synth8-length: 64
song(
  // Johann Sebastian Bach — Invention No. 1 in C major, BWV 772
  melody("c4 e4 d4 c4 b3 a3 g3 a3 b3 c4 d4 e4 f4 e4 d4 c4 b3 c4 d4 e4 f4 g4 a4 g4 f4 e4 d4 c4 b3 a3 g3 f3 e3 d3 c3/2").fast(4).sound("square"),
  melody("_ c5 d5 e5 f5 d5 e5 c5 g5/2 c6/2 b5 c6 b5 c6 c6/2 d6 g5 a5 b5 c6 a5 b5 g5 d6/2 g6/2 f6 g6 f6 g6 g6/2 e6 a6 g6 f6 e6 g6 f6 a6 g6 f6 e6 d6 c6 e6 d6 f6 e6 d6 c6 b5 a5 c6 b5 d6 c6 b5 a5 g5 f5 a5 g5 b5 a5 c6 b5 d6 c6 e6 d6 c6 b5 a5 g5 f5 e5 d5 c5/2").fast(4).sound("triangle")
)`;

export default DEFAULT_SONG_SOURCE;
