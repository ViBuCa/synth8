import { Waveform } from "../model";
import type { AstNode } from "../model/ast";
import { parseBeatPattern } from "./beat-pattern-parser";
import { parseMelodyPattern } from "./melody-pattern-parser";
import { tokenize, type Token } from "./tokenizer";

type ParserState = {
  tokens: Token[];
  index: number;
};

type Modifiers = {
  rate: number;
  transpose: number;
  repeat: number;
  loop: boolean;
  offset: number;
  sound?: Waveform;
  gain?: number;
};

const createState = (tokens: Token[]): ParserState => ({
  tokens,
  index: 0,
});

const peek = (state: ParserState): Token | undefined => {
  return state.tokens[state.index];
};

const advance = (state: ParserState): Token | undefined => {
  return state.tokens[state.index++];
};

const isAtEnd = (state: ParserState): boolean => {
  return state.index >= state.tokens.length;
};

const expectIdentifier = (state: ParserState, value: string): void => {
  const token = advance(state);

  if (token?.type !== "identifier" || token.value !== value) {
    throw new Error(`Expected identifier "${value}".`);
  }
};

const expectAnyIdentifier = (state: ParserState): string => {
  const token = advance(state);

  if (token?.type !== "identifier") {
    throw new Error("Expected identifier.");
  }

  return token.value;
};

const expectString = (state: ParserState): string => {
  const token = advance(state);

  if (token?.type !== "string") {
    throw new Error("Expected string.");
  }

  return token.value;
};

const expectNumber = (state: ParserState): number => {
  const token = advance(state);

  if (token?.type !== "number") {
    throw new Error("Expected number.");
  }

  return token.value;
};

const expectSymbol = (
  state: ParserState,
  value: "(" | ")" | "." | ","
): void => {
  const token = advance(state);

  if (token?.type !== "symbol" || token.value !== value) {
    throw new Error(`Expected "${value}".`);
  }
};

const matchSymbol = (
  state: ParserState,
  value: "(" | ")" | "." | ","
): boolean => {
  const token = peek(state);

  if (token?.type === "symbol" && token.value === value) {
    advance(state);
    return true;
  }

  return false;
};

const checkSaneRange = (value: number, name: string): void => {
  if (!Number.isFinite(value) || value <= 0 || value > 100) {
    throw new Error(`Invalid ${name}: ${value}`);
  }
};

const parseModifiers = (state: ParserState): Modifiers => {
  let rate = 1;
  let transpose = 0;
  let repeat = 1;
  let loop = false;
  let offset = 0;
  let gain: number | undefined = undefined;
  let sound: Waveform | undefined = undefined;

  while (matchSymbol(state, ".")) {
    const modifier = expectAnyIdentifier(state);

    let value: number = 0;
    let str = '';

    expectSymbol(state, "(");

    switch (modifier) {
      case "rate":
      case "fast":
      case "slow":
      case "transpose":
      case "repeat":
      case "offset":
      case "gain":
        value = expectNumber(state);
        break;
      case "sound":
        str = expectString(state);
      case "loop":
        break;
      default:
        throw new Error(`Unknown modifier: ${modifier}`);
    }

    expectSymbol(state, ")");

    switch (modifier) {
      case "rate":
        checkSaneRange(value, "rate");
        rate = value;
        break;

      case "fast":
        checkSaneRange(value, "fast");
        rate *= value;
        break;

      case "slow":
        checkSaneRange(value, "slow");
        rate /= value;
        break;

      case "transpose":
        if (!Number.isInteger(value)) {
          throw new Error(`Transpose value must be an integer: ${value}`);
        }
        transpose += value;
        break;

      case "offset":
        if (!Number.isInteger(value)) {
          throw new Error(`Offset value must be an integer: ${value}`);
        }
        offset += value;
        break;

      case "repeat":
        if (!Number.isInteger(value) || value <= 0) {
          throw new Error(`Repeat value must be an integer: ${value}`);
        }
        repeat = value;
        break;

      case "gain":
        if (value < 0 || value > 1) {
          throw new Error("gain() must be between 0 and 1.");
        }

        gain = value;
        break;

      case "sound":
        if ((str as Waveform) != null) {
          sound = str as Waveform;
        } else {
          throw new Error(`Illegal sound value: ${str}`);
        }
        break
      case "loop":
        loop = true;
        break;
    }
  }

  return { rate, transpose, repeat, loop, offset, sound, gain };
};

const parseBeatExpression = (state: ParserState): AstNode => {
  expectIdentifier(state, "beat");
  expectSymbol(state, "(");

  const body = expectString(state);

  expectSymbol(state, ")");

  const { rate, repeat, loop, offset, sound, gain } = parseModifiers(state);

  return {
    kind: "BeatExpression",
    steps: parseBeatPattern(body),
    rate,
    repeat,
    loop,
    offset,
    sound,
    gain
  };
};

const parseMelodyExpression = (state: ParserState): AstNode => {
  expectIdentifier(state, "melody");
  expectSymbol(state, "(");

  const body = expectString(state);

  expectSymbol(state, ")");

  const { rate, transpose, repeat, loop, offset, sound, gain } = parseModifiers(state);

  return {
    kind: "MelodyExpression",
    notes: parseMelodyPattern(body),
    rate,
    transpose,
    repeat,
    loop,
    offset,
    sound,
    gain
  };
};

const parseSequenceExpression = (state: ParserState): AstNode => {
  expectIdentifier(state, "sequence");
  expectSymbol(state, "(");

  const patterns: AstNode[] = [];

  if (!matchSymbol(state, ")")) {
    do {
      patterns.push(parseExpression(state));
    } while (matchSymbol(state, ","));

    expectSymbol(state, ")");
  }

  if (patterns.length === 0) {
    throw new Error("sequence() requires at least one pattern.");
  }

  const { repeat, loop, offset, sound, gain } = parseModifiers(state);

  return {
    kind: "SequenceExpression",
    patterns,
    repeat,
    loop,
    offset,
    sound,
    gain
  };
};

const parseSongExpression = (state: ParserState): AstNode => {
  expectIdentifier(state, "song");
  expectSymbol(state, "(");

  const tracks: AstNode[] = [];

  if (!matchSymbol(state, ")")) {
    do {
      tracks.push(parseExpression(state));
    } while (matchSymbol(state, ","));

    expectSymbol(state, ")");
  }

  if (tracks.length === 0) {
    throw new Error("song() requires at least one track.");
  }

  return {
    kind: "SongExpression",
    tracks,
  };
};

const parseExpression = (state: ParserState): AstNode => {
  const token = peek(state);

  if (token?.type !== "identifier") {
    throw new Error("Expected expression.");
  }

  switch (token.value) {
    case "beat":
      return parseBeatExpression(state);

    case "melody":
      return parseMelodyExpression(state);

    case "sequence":
      return parseSequenceExpression(state);

    case "song":
      return parseSongExpression(state);

    default:
      throw new Error(`Unknown expression: ${token.value}`);
  }
};

export const parse = (source: string): AstNode => {
  const state = createState(tokenize(source));
  const node = parseExpression(state);

  if (!isAtEnd(state)) {
    throw new Error("Unexpected tokens after expression.");
  }

  return node;
};