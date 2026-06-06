export type AstNode = BeatExpression;

export type BeatExpression = {
  kind: "BeatExpression";
  steps: BeatStep[];
  rate: number;
};

export type BeatStep = BeatSound | BeatGroup | BeatParallel;

export type BeatSound = {
  kind: "BeatSound";
  value: string;
};

export type BeatGroup = {
  kind: "BeatGroup";
  steps: BeatStep[];
};

export type BeatParallel = {
  kind: "BeatParallel";
  sounds: BeatSound[];
};