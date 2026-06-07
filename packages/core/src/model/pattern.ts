import type { Event } from "./event";

export type Pattern = {
  length: number;
  loopLength: number;
  events: Event[];
  loop: boolean;
};