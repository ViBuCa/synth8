export type EventType = "drum";

export type Event = {
  time: number;
  dur: number;
  type: EventType;
  value: string;
};