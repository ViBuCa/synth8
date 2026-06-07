export type AstNode =
  | BeatExpression
  | MelodyExpression
  | SongExpression;

export type BeatExpression = {
  kind: "BeatExpression";
  steps: BeatStep[];
  rate: number;
};

export type SongExpression = {
  kind: "SongExpression";
  tracks: AstNode[];
};

export type MelodyExpression = {
  kind: "MelodyExpression";
  notes: MelodyStep[];
  rate: number;
};

export type MelodyStep =
  | MelodyNote
  | MelodyGroup
  | MelodyParallel;

export type MelodyNote = {
  kind: "MelodyNote";
  value: string;
  velocity?: number;
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
};

export type BeatGroup = {
  kind: "BeatGroup";
  steps: BeatStep[];
};

export type BeatParallel = {
  kind: "BeatParallel";
  sounds: BeatSound[];
};