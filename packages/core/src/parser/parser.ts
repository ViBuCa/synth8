import type { EffectConfig, EnvelopeConfig, PlaybackBank, PlaybackPreset, Waveform } from "../model";
import type { ArpeggioMode, AstNode } from "../model/ast";
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
  preset?: PlaybackPreset;
  bank?: PlaybackBank;
  sound?: Waveform;
  gain?: number;
  pan?: number;
  envelope?: EnvelopeConfig;
  effects?: EffectConfig;
  arp?: ArpeggioMode;
};

const WAVEFORMS: Waveform[] = ["sine", "triangle", "square", "sawtooth"];
const ARPEGGIOS: ArpeggioMode[] = ["up", "down", "updown"];
const PLAYBACK_PRESETS: PlaybackPreset[] = [
  "chip-lead",
  "chip-bass",
  "soft-pad",
  "metal-rhythm",
  "arcade-pluck",
];
const PLAYBACK_BANKS: PlaybackBank[] = ["default", "808", "arcade"];

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

const expectOptionalString = (state: ParserState): string | undefined => {
  const token = advance(state);

  if (token?.type !== "string") {
    return undefined;
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
  let preset: PlaybackPreset | undefined = undefined;
  let bank: PlaybackBank | undefined = undefined;
  let sound: Waveform | undefined = undefined;
  let pan: number | undefined = undefined;
  const envelope: EnvelopeConfig = {};
  const effects: EffectConfig = {};
  let arp: ArpeggioMode | undefined = undefined;

  while (matchSymbol(state, ".")) {
    const modifier = expectAnyIdentifier(state);

    let value: number = 0;
    let str = '';

    let skipClosing = false;

    expectSymbol(state, "(");

    switch (modifier) {
      case "rate":
      case "fast":
      case "slow":
      case "transpose":
      case "repeat":
      case "offset":
      case "gain":
      case "pan":
      case "attack":
      case "decay":
      case "sustain":
      case "release":
      case "delay":
      case "echo":
      case "room":
      case "reverb":
      case "lowpass":
      case "highpass":
      case "distortion":
      case "chorus":
        value = expectNumber(state);
        break;
      case "arp":
        const id = expectOptionalString(state);
        if (!id) {
          str = "up";
          skipClosing = true
        } else {
          str = id;
        }
        break;
      case "sound":
      case "preset":
      case "bank":
        str = expectString(state);
        break;
      case "loop":
        break;
      default:
        throw new Error(`Unknown modifier: ${modifier}`);
    }

    if (!skipClosing) {
      expectSymbol(state, ")");
    }

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

      case "pan":
        if (value < -1 || value > 1) {
          throw new Error("pan() must be between -1 and 1.");
        }
        pan = value;
        break;

      case "sound":
        if (!WAVEFORMS.includes(str as Waveform)) {
          throw new Error(`Illegal sound value: ${str}`);
        }
        sound = str as Waveform;
        break;

      case "preset":
        if (!PLAYBACK_PRESETS.includes(str as PlaybackPreset)) {
          throw new Error(`Illegal preset value: ${str}`);
        }
        preset = str as PlaybackPreset;
        break;

      case "bank":
        if (!PLAYBACK_BANKS.includes(str as PlaybackBank)) {
          throw new Error(`Illegal bank value: ${str}`);
        }
        bank = str as PlaybackBank;
        break;

      case "attack":
      case "decay":
      case "release":
        if (value < 0 || value > 30) {
          throw new Error(`${modifier}() must be between 0 and 30 seconds.`);
        }
        envelope[modifier] = value;
        break;

      case "sustain":
        if (value < 0 || value > 1) {
          throw new Error("sustain() must be between 0 and 1.");
        }
        envelope.sustain = value;
        break;

      case "delay":
        if (value < 0 || value > 2) {
          throw new Error("delay() must be between 0 and 2 seconds.");
        }
        effects.delay = value;
        break;

      case "echo":
      case "room":
      case "reverb":
      case "distortion":
      case "chorus":
        if (value < 0 || value > 1) {
          throw new Error(`${modifier}() must be between 0 and 1.`);
        }
        effects[modifier] = value;
        break;

      case "arp": 
        if (!ARPEGGIOS.includes(str as ArpeggioMode)) {
          throw new Error(`Illegal arp value: ${str}`);
        }
        arp = str as ArpeggioMode;
        break;

      case "lowpass":
      case "highpass":
        if (value < 20 || value > 20000) {
          throw new Error(`${modifier}() must be between 20 and 20000 Hz.`);
        }
        effects[modifier] = value;
        break;

      case "loop":
        loop = true;
        break;
    }
  }

  return {
    rate,
    transpose,
    repeat,
    loop,
    offset,
    preset,
    bank,
    sound,
    gain,
    pan,
    envelope: Object.keys(envelope).length > 0 ? envelope : undefined,
    effects: Object.keys(effects).length > 0 ? effects : undefined,
    arp
  };
};

const parseBeatExpression = (state: ParserState): AstNode => {
  expectIdentifier(state, "beat");
  expectSymbol(state, "(");

  const body = expectString(state);

  expectSymbol(state, ")");

  const steps = parseBeatPattern(body);

  if (steps.length === 0) {
    throw new Error("beat() requires at least one step.");
  }

  const { rate, repeat, loop, offset, preset, bank, sound, gain, pan, envelope, effects } = parseModifiers(state);

  return {
    kind: "BeatExpression",
    steps,
    rate,
    repeat,
    loop,
    offset,
    preset,
    bank,
    sound,
    gain,
    pan,
    envelope,
    effects,
  };
};

const parseMelodyExpression = (state: ParserState): AstNode => {
  expectIdentifier(state, "melody");
  expectSymbol(state, "(");

  const body = expectString(state);

  expectSymbol(state, ")");

  const notes = parseMelodyPattern(body);

  if (notes.length === 0) {
    throw new Error("melody() requires at least one note.");
  }

  const { rate, transpose, repeat, loop, offset, preset, bank, sound, gain, pan, envelope, effects, arp } = parseModifiers(state);

  return {
    kind: "MelodyExpression",
    notes,
    rate,
    transpose,
    repeat,
    loop,
    offset,
    preset,
    bank,
    sound,
    gain,
    pan,
    envelope,
    effects,
    arp
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

  const { repeat, loop, offset, preset, bank, sound, gain, pan, envelope, effects } = parseModifiers(state);

  return {
    kind: "SequenceExpression",
    patterns,
    repeat,
    loop,
    offset,
    preset,
    bank,
    sound,
    gain,
    pan,
    envelope,
    effects,
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
