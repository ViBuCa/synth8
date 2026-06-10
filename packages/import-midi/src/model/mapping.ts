export type MidiToSynth8Options = {
    step?: number;
    track?: string;
    includeVelocity?: boolean;
    trackOrder?: string[];
};

export type SlotNote = {
    midi: number;
    token: string;
}