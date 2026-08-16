export type EventType = 'drum' | 'note';

import type { Articulation } from "./ast";

export type Event = {
  time: number;
  dur: number;
  type: EventType;
  value: string;
  velocity?: number;
  articulation?: Articulation;
  bend?: number;
};