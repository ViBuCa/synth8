import type { AstNode, Event, Pattern, BeatStep } from "../model";
import { parse } from "../parser/parser";

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

const compileSteps = (
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
        events.push(...compileSteps(step.steps, time, stepDuration));
        break;

      case "BeatParallel":
        for (const sound of step.sounds) {
          if (sound.value === REST) continue;

          events.push({
            time,
            dur: stepDuration,
            type: "drum",
            value: sound.value,
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

      const beatDuration = 1 / ast.rate;
      const length = ast.steps.length * beatDuration;

      return {
        length,
        events: compileSteps(ast.steps, 0, length),
      };
    }
  }
};

export const compile = (source: string): Pattern => {
  return compileAst(parse(source));
};