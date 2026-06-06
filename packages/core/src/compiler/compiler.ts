import type { AstNode } from "../model/ast";
import type { Pattern } from "../model/pattern";
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

const compileAst = (ast: AstNode): Pattern => {
  switch (ast.kind) {
    case "BeatExpression": {
      for (const sound of ast.sounds) {
        if (sound === REST) {
          continue; 
        }

        if (!VALID_DRUMS.has(sound)) {
          throw new Error(`Unknown drum sound: ${sound}`);
        }
      }

      const dur = 1 / ast.rate;

      return {
        length: ast.sounds.length * dur,
        events: ast.sounds.flatMap((sound, index) => {
          if (sound === REST) {
            return [];
          }

          return [
            {
              time: index * dur,
              dur,
              type: "drum",
              value: sound,
            }
          ];
        }),
      };
    }
  }
};

export const compile = (source: string): Pattern => {
  return compileAst(parse(source));
};