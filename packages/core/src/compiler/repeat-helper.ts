import { Event } from "../model/event";

export const repeatArray = <T>(items: T[], count: number): T[] => {
    return Array.from({ length: count }).flatMap(() => items);
};

export const loopEvents = (
  events: Event[],
  trackLength: number,
  songLength: number
): Event[] => {
  if (trackLength <= 0) {
    throw new Error("Cannot loop a zero-length pattern.");
  }

  const result: Event[] = [];

  for (let offset = 0; offset < songLength; offset += trackLength) {
    for (const event of events) {
      const time = event.time + offset;

      if (time < songLength) {
        result.push({
          ...event,
          time,
        });
      }
    }
  }

  return result;
}