import * as Tone from "tone";

export type DrumInstrument = Tone.ToneAudioNode & {
    triggerAttackRelease: (...args: any[]) => unknown;
};

export type DrumKit = {
    kick?: DrumInstrument;
    snare?: DrumInstrument;
    hihat?: DrumInstrument;
    clap?: DrumInstrument;
    openhat?: DrumInstrument;
    lowtom?: DrumInstrument;
    midtom?: DrumInstrument;
    hitom?: DrumInstrument;
    rim?: DrumInstrument;
    cowbell?: DrumInstrument;
    crash?: DrumInstrument;
    ride?: DrumInstrument;
    tambourine?: DrumInstrument;
    shaker?: DrumInstrument;
    connect(output: Tone.ToneAudioNode): void;
    dispose(): void;
};
