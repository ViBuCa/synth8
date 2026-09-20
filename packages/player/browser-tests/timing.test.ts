import { compile } from "@vibuca/synth8-core";
import { expect, it } from "vitest";
import { renderNative } from "../src/backend/native-render";

const source = `song(
  melody("c4/0.25 d4/0.25 e4/0.25 f4/0.25"),
  melody("c5/0.5 _/0.5")
)`;

it.each([30, 60, 90, 120])("renders a %i BPM pattern at its musical duration", async (bpm) => {
  const pattern = compile(source);
  const buffer = await renderNative(pattern, { bpm, tail: 0 });
  expect(pattern.length).toBe(1);
  expect(buffer.duration).toBeCloseTo(60 / bpm, 3);
});

it("keeps note event positions in beat time independent of BPM", () => {
  const pattern = compile(source);
  const noteTimes = pattern.layers[0].events.map((event) => event.time);
  expect(noteTimes).toEqual([0, 0.25, 0.5, 0.75]);
});
