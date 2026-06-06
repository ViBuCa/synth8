import { describe, expect, it } from "vitest";
import { tokenize } from "../../parser/tokenizer";

describe("tokenize", () => {
  it("tokenizes a beat expression", () => {
    expect(tokenize(`beat("kick snare hihat hihat").rate(2)`)).toEqual([
      { type: "identifier", value: "beat" },
      { type: "symbol", value: "(" },
      { type: "string", value: "kick snare hihat hihat" },
      { type: "symbol", value: ")" },
      { type: "symbol", value: "." },
      { type: "identifier", value: "rate" },
      { type: "symbol", value: "(" },
      { type: "number", value: 2 },
      { type: "symbol", value: ")" }
    ]);
  });
});