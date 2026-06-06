export type AstNode = BeatExpression;

export type BeatExpression = {
  kind: "BeatExpression";
  steps: BeatStep[];
  rate: number;
};

export type BeatStep = BeatSound | BeatGroup;

export type BeatSound = {
  kind: "BeatSound";
  value: string;
};

export type BeatGroup = {
  kind: "BeatGroup";
  steps: BeatStep[];
};