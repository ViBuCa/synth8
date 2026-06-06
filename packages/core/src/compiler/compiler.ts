import type { AstNode } from "../model/ast";
import type { Pattern } from "../model/pattern";
import { parse } from "../parser/parser";

const VALID_DRUMS = new Set(["kick", "snare", "hihat"]);

const compileAst = (ast: AstNode): Pattern => {
  switch (ast.kind) {
    case "BeatExpression": {
      for (const sound of ast.sounds) {
        if (!VALID_DRUMS.has(sound)) {
          throw new Error(`Unknown drum sound: ${sound}`);
        }
      }

      const dur = 1 / ast.rate;

      return {
        length: ast.sounds.length * dur,
        events: ast.sounds.map((sound, index) => ({
          time: index * dur,
          dur,
          type: "drum",
          value: sound,
        })),
      };
    }
  }
};

export const compile = (source: string): Pattern => {
  return compileAst(parse(source));
};