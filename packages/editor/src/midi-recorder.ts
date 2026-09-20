export type RecordedMidiNote = {
  pitch: number;
  start: number;
  duration: number;
  velocity: number;
};

export type MidiRecorderOptions = {
  /** Beat duration in seconds at the moment recording starts. */
  secondsPerBeat: number;
  /** Quantization step in beats. Defaults to a sixteenth note. */
  quantize?: number;
  /** Called when recording stops with the captured notes. */
  onComplete?: (notes: RecordedMidiNote[]) => void;
};

export type MidiInput = MIDIInput;

/** Quantizes MIDI notes without requiring Web MIDI, useful for tests and imports. */
export function quantizeMidiNotes(notes: RecordedMidiNote[], step = 0.25): RecordedMidiNote[] {
  const safeStep = Math.max(0.0001, step);
  return notes.map((note) => ({
    ...note,
    start: Math.max(0, Math.round(note.start / safeStep) * safeStep),
    duration: Math.max(safeStep, Math.round(note.duration / safeStep) * safeStep),
  }));
}

/** Small Web MIDI recorder kept separate from the editor UI and loaded only when needed. */
export class MidiRecorder {
  private access?: MIDIAccess;
  private input?: MIDIInput;
  private startedAt = 0;
  private active = new Map<number, { start: number; velocity: number }>();
  private notes: RecordedMidiNote[] = [];

  constructor(private readonly options: MidiRecorderOptions) {}

  static async inputs(): Promise<MIDIInput[]> {
    if (!navigator.requestMIDIAccess) throw new Error("Web MIDI is not supported by this browser.");
    const access = await navigator.requestMIDIAccess();
    return [...access.inputs.values()];
  }

  async start(input?: MIDIInput): Promise<void> {
    if (!navigator.requestMIDIAccess) throw new Error("Web MIDI is not supported by this browser.");
    this.access = await navigator.requestMIDIAccess();
    this.input = input ?? [...this.access.inputs.values()][0];
    if (!this.input) throw new Error("No MIDI input device is available.");
    this.notes = [];
    this.active.clear();
    this.startedAt = performance.now();
    this.input.addEventListener("midimessage", this.handleMessage);
  }

  stop(): RecordedMidiNote[] {
    this.input?.removeEventListener("midimessage", this.handleMessage);
    const now = this.beatsNow();
    for (const [pitch, note] of this.active) this.notes.push({ pitch, start: note.start, duration: Math.max(0.01, now - note.start), velocity: note.velocity });
    this.active.clear();
    const result = quantizeMidiNotes(this.notes, this.options.quantize ?? 0.25).sort((a, b) => a.start - b.start || a.pitch - b.pitch);
    this.options.onComplete?.(result);
    return result;
  }

  private beatsNow(): number {
    return (performance.now() - this.startedAt) / 1000 / Math.max(0.0001, this.options.secondsPerBeat);
  }

  private handleMessage = (event: MIDIMessageEvent): void => {
    const data = event.data;
    if (!data || data.length < 3) return;
    const command = data[0] & 0xf0;
    const pitch = data[1] & 0x7f;
    const velocity = (data[2] & 0x7f) / 127;
    if (command === 0x90 && velocity > 0) {
      this.active.set(pitch, { start: this.beatsNow(), velocity });
    } else if (command === 0x80 || (command === 0x90 && velocity === 0)) {
      const note = this.active.get(pitch);
      if (!note) return;
      this.notes.push({ pitch, start: note.start, duration: Math.max(0.01, this.beatsNow() - note.start), velocity: note.velocity });
      this.active.delete(pitch);
    }
  };
}
