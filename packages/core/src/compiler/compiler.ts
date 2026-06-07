import type { AstNode, Event, Pattern, BeatStep, MelodyStep } from "../model";
import { parse } from "../parser/parser";
import { loopEvents, repeatArray } from "./repeat-helper";
import { transposeNote } from "./transpose-helper";

const REST = "_";

const VALID_DRUMS = new Set([
  "kick",
  "snare",
  "clap",
  "hihat",
  "openhat",
  "tom",
  "rim",
  "cowbell",
]);

const validateSound = (sound: string): void => {
  if (sound === REST) return;

  if (!VALID_DRUMS.has(sound)) {
    throw new Error(`Unknown drum sound: ${sound}`);
  }
};

const validateStep = (step: BeatStep): void => {
  if (step.kind === "BeatGroup") {
    for (const child of step.steps) {
      validateStep(child);
    }
    return;
  }

  if (step.kind === "BeatParallel") {
    for (const sound of step.sounds) {
      validateSound(sound.value);
    }
    return;
  }

  validateSound(step.value);
};

const createDrumEvent = (
  time: number,
  dur: number,
  value: string,
  velocity?: number
): Event => ({
  time,
  dur,
  type: "drum",
  value,
  ...(velocity !== undefined ? { velocity } : {}),
});

const createNoteEvent = (
  time: number,
  dur: number,
  value: string,
  velocity?: number
): Event => ({
  time,
  dur,
  type: "note",
  value,
  ...(velocity !== undefined ? { velocity } : {}),
});

const getBeatStepDuration = (step: BeatStep): number => {
  switch (step.kind) {
    case "BeatSound":
      return step.duration;

    case "BeatGroup":
      return 1;

    case "BeatParallel":
      return Math.max(...step.sounds.map((sound) => sound.duration));
  }
};

const getMelodyStepDuration = (step: MelodyStep): number => {
  switch (step.kind) {
    case "MelodyNote":
      return step.duration;

    case "MelodyGroup":
      return 1;

    case "MelodyParallel":
      return Math.max(...step.notes.map((note) => note.duration));
  }
};

const getBeatStepsDuration = (steps: BeatStep[]): number =>
  steps.reduce((sum, step) => sum + getBeatStepDuration(step), 0);

const getMelodyStepsDuration = (notes: MelodyStep[]): number =>
  notes.reduce((sum, note) => sum + getMelodyStepDuration(note), 0);

const compileBeatSteps = (
  steps: BeatStep[],
  start: number,
  duration: number
): Event[] => {
  if (steps.length === 0) return [];

  const events: Event[] = [];
  const totalDuration = getBeatStepsDuration(steps);
  const unitDuration = duration / totalDuration;

  let time = start;

  for (const step of steps) {
    const stepDuration = getBeatStepDuration(step) * unitDuration;

    switch (step.kind) {
      case "BeatGroup":
        events.push(...compileBeatSteps(step.steps, time, stepDuration));
        break;

      case "BeatParallel":
        for (const sound of step.sounds) {
          if (sound.value === REST) continue;

          events.push(
            createDrumEvent(
              time,
              sound.duration * unitDuration,
              sound.value,
              sound.velocity
            )
          );
        }
        break;

      case "BeatSound":
        if (step.value !== REST) {
          events.push(
            createDrumEvent(time, stepDuration, step.value, step.velocity)
          );
        }
        break;
    }

    time += stepDuration;
  }

  return events;
};

const compileMelodySteps = (
  notes: MelodyStep[],
  start: number,
  dur: number,
  transpose: number
): Event[] => {
  if (notes.length === 0) return [];

  const events: Event[] = [];
  const totalDuration = getMelodyStepsDuration(notes);
  const unitDuration = dur / totalDuration;

  let time = start;

  for (const note of notes) {
    const noteDuration = getMelodyStepDuration(note) * unitDuration;

    if (note.kind === "MelodyNote") {
      if (note.value !== REST) {
        events.push(
          createNoteEvent(
            time,
            noteDuration,
            transposeNote(note.value, transpose),
            note.velocity
          )
        );
      }
    }

    if (note.kind === "MelodyParallel") {
      for (const child of note.notes) {
        if (child.value === REST) continue;

        events.push(
          createNoteEvent(
            time,
            child.duration * unitDuration,
            transposeNote(child.value, transpose),
            child.velocity
          )
        );
      }
    }

    if (note.kind === "MelodyGroup") {
      events.push(...compileMelodySteps(note.notes, time, noteDuration, transpose));
    }

    time += noteDuration;
  }

  return events;
};

const compileAst = (ast: AstNode): Pattern => {
  switch (ast.kind) {
    case "BeatExpression": {
      for (const step of ast.steps) {
        validateStep(step);
      }

      const steps = repeatArray(ast.steps, ast.repeat);
      const beatDuration = 1 / ast.rate;

      const patternLength = getBeatStepsDuration(steps) * beatDuration;
      const length = ast.offset + patternLength;

      return {
        length,
        loopLength: patternLength,
        events: compileBeatSteps(steps, ast.offset, patternLength),
        loop: ast.loop,
      };
    }

    case "MelodyExpression": {
      const notes = repeatArray(ast.notes, ast.repeat);
      const beatDuration = 1 / ast.rate;

      const patternLength = getMelodyStepsDuration(notes) * beatDuration;
      const length = ast.offset + patternLength;

      return {
        length,
        loopLength: patternLength,
        events: compileMelodySteps(notes, ast.offset, patternLength, ast.transpose),
        loop: ast.loop,
      };
    }

    case "SongExpression": {
      const patterns = ast.tracks.map(compileAst);
      const length = Math.max(...patterns.map((p) => p.length));

      const events = patterns.flatMap((pattern) => {
        if (!pattern.loop) {
          return pattern.events;
        }

        return loopEvents(pattern.events, pattern.loopLength, length);
      });

      return {
        length,
        loopLength: length,
        events: events.sort((a, b) => a.time - b.time),
        loop: true,
      };
    }

    case "SequenceExpression": {
      let sequenceLength = 0;
      const sequenceEvents: Event[] = [];

      for (const patternAst of ast.patterns) {
        const pattern = compileAst(patternAst);

        sequenceEvents.push(
          ...pattern.events.map((event) => ({
            ...event,
            time: event.time + sequenceLength,
          }))
        );

        sequenceLength += pattern.length;
      }

      const events: Event[] = [];

      for (let i = 0; i < ast.repeat; i++) {
        events.push(
          ...sequenceEvents.map((event) => ({
            ...event,
            time: event.time + ast.offset + i * sequenceLength,
          }))
        );
      }

      const repeatedLength = sequenceLength * ast.repeat;

      return {
        length: ast.offset + repeatedLength,
        loopLength: repeatedLength,
        events,
        loop: ast.loop,
      };
    }

    default: {
      throw new Error("Unknown AST node");
    }
  }
};

export const compile = (source: string): Pattern => {
  return compileAst(parse(source));
};