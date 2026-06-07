import type { AstNode, Event, Pattern, BeatStep, MelodyStep } from "../model";
import { parse } from "../parser/parser";
import { repeatArray } from "./repeat-helper";
import { transposeNote } from "./transpose-helper";

const REST = '_';
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

const compileBeatSteps = (
  steps: BeatStep[],
  start: number,
  duration: number
): Event[] => {
  if (steps.length === 0) return [];

  const events: Event[] = [];
  const stepDuration = duration / steps.length;

  steps.forEach((step, index) => {
    const time = start + index * stepDuration;

    switch (step.kind) {
      case "BeatGroup":
        events.push(...compileBeatSteps(step.steps, time, stepDuration));
        break;

      case "BeatParallel":
        for (const sound of step.sounds) {
          if (sound.value === REST) continue;

          events.push({
            time,
            dur: stepDuration,
            type: "drum",
            value: sound.value,
            velocity: sound.velocity,
          });
        }
        break;

      case "BeatSound":
        if (step.value === REST) break;

        events.push({
          time,
          dur: stepDuration,
          type: "drum",
          value: step.value,
          velocity: step.velocity,
        });
        break;
    }
  });

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
      const length = steps.length * beatDuration;

      return {
        length,
        events: compileBeatSteps(steps, 0, length),
      };
    }

    case "MelodyExpression": {
      const notes = repeatArray(ast.notes, ast.repeat);
      const beatDuration = 1 / ast.rate;
      const length = notes.length * beatDuration;
      const transpose = ast.transpose;

      return {
        length,
        events: compileMelodySteps(notes, 0, length, transpose),
      };
    }

    case "SongExpression": {
      const patterns = ast.tracks.map(compileAst);

      return {
        length: Math.max(...patterns.map((pattern) => pattern.length)),
        events: patterns.flatMap((pattern) => pattern.events),
      };
    }

    default: {
      throw new Error("Unknown AST node");
    }
  }
}

const compileMelodySteps = (
  notes: MelodyStep[],
  start: number,
  dur: number,
  transpose: number
): Event[] => {
  const stepDur = dur / notes.length;

  return notes.flatMap((note, index) => {
    const time = start + index * stepDur;

    if (note.kind === "MelodyNote") {
      if (note.value === "_") return [];

      return [{
        time,
        dur: stepDur,
        type: "note",
        value: transposeNote(note.value, transpose),
        velocity: note.velocity,
      }];
    }

    if (note.kind === "MelodyParallel") {
      return note.notes
        .filter((child) => child.value !== "_")
        .map((child) => ({
          time,
          dur: stepDur,
          type: "note",
          value: transposeNote(child.value, transpose),
          velocity: child.velocity,
        }));
    }
    return compileMelodySteps(note.notes, time, stepDur, transpose);
  });
}

export const compile = (source: string): Pattern => {
  return compileAst(parse(source));
};