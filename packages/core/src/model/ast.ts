export type AstNode = BeatExpression;

export type BeatExpression = {
  kind: "BeatExpression";
  sounds: string[];
  rate: number;
};