import { EnvelopeConfig, PlaybackBank, PlaybackPreset, Waveform } from "./playback-config";

export type AstNode =
  | BeatExpression
  | MelodyExpression
  | SongExpression
  | SequenceExpression;

type Modifiers = {
  repeat: number;
  offset: number;
  loop: boolean;
  preset?: PlaybackPreset;
  bank?: PlaybackBank;
  sound?: Waveform;
  gain?: number;
  pan?: number;
  envelope?: EnvelopeConfig;
}

export type SequenceExpression = {
  kind: "SequenceExpression";
  patterns: AstNode[];
} & Modifiers;

export type BeatExpression = {
  kind: "BeatExpression";
  steps: BeatStep[];
  rate: number;
} & Modifiers;

export type SongExpression = {
  kind: "SongExpression";
  tracks: AstNode[];
};

export type MelodyExpression = {
  kind: "MelodyExpression";
  notes: MelodyStep[];
  rate: number;
  transpose: number;
} & Modifiers;

export type MelodyStep =
  | MelodyNote
  | MelodyGroup
  | MelodyParallel;

export type MelodyNote = {
  kind: "MelodyNote";
  value: string;
  velocity?: number;
  duration: number;
};

export type MelodyGroup = {
  kind: "MelodyGroup";
  notes: MelodyStep[];
};

export type MelodyParallel = {
  kind: "MelodyParallel";
  notes: MelodyNote[];
};

export type BeatStep = BeatSound | BeatGroup | BeatParallel;

export type BeatSound = {
  kind: "BeatSound";
  value: string;
  velocity?: number;
  duration: number;
};

export type BeatGroup = {
  kind: "BeatGroup";
  steps: BeatStep[];
};

export type BeatParallel = {
  kind: "BeatParallel";
  sounds: BeatSound[];
};
