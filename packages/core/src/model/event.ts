export type Synt8EventType = "drum";

export type Synt8Event = {
  time: number;
  dur: number;
  type: Synt8EventType;
  value: string;
};