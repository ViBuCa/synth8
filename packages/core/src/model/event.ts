export type EventType = 'drum' | 'note';

export type Event = {
  time: number;
  dur: number;
  type: EventType;
  value: string;
};