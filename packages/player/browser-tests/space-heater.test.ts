import { compile } from "@vibuca/synth8-core";
import { renderOgg } from "../src/playback/render";
import { expect, it } from "vitest";

const spaceHeater = `song(
  melody("e4/0.5 e4/0.5 g4/0.5 b4/0.5 e5/1 _/1 d5/0.5 b4/0.5 g4/0.5 e4/0.5 g4/1 _/1 e5/0.5 d5/0.5 b4/0.5 g4/0.5 e4/1 _/1 _/1 bb4/0.5 f5/0.5 bb5/1 f5/0.5 bb5/0.5 ab5/0.5 g5/0.5 f5/1 _/1 bb4/0.5 f5/0.5 bb5/0.5 f5/0.5 db6/1 c6/0.5 bb5/0.5 ab5/0.5 g5/0.5 f5/1 _/1 e5/0.5 g5/0.5 b5/0.5 e6/0.5 d6/1 b5/0.5 g5/0.5 e5/0.5 g5/1 _/1 bb5/0.5 f6/0.5 bb6/1 f6/0.5 db6/0.5 c6/0.5 bb5/1 _/1 e6/0.5 d6/0.5 b5/0.5 g5/0.5 e5/1 _/1 e5/0.5 g5/0.5 b5/0.5 e6/1 _/1 bb5/0.5 f6/0.5 bb6/1 ab6/0.5 g6/0.5 f6/1 _/1").preset("metal-lead").gain(0.62).distortion(0.34).delay(0.12),
  melody("e2/0.5 e2/0.5 b2/0.5 e2/0.5 e2/0.5 e2/0.5 g2/0.5 b2/0.5 e2/0.5 e2/0.5 b2/0.5 e2/0.5 d2/0.5 d2/0.5 b1/0.5 d2/0.5").preset("metal-bass").gain(0.9).distortion(0.2).loop(),
  melody("e3+b3/1 e3+b3/1 g3+d4/1 e3+b3/1 e3+b3/1 d3+a3/1 b2+f3/1 d3+a3/1 e3+b3/1 e3+b3/1 g3+d4/1 e3+b3/1 d3+a3/1 b2+f3/1 e3+b3/1 _/1").preset("metal-rhythm").gain(0.48).distortion(0.38).loop(),
  beat("crash+kick+hihat hihat kick+hihat snare+hihat hihat kick+kick+hihat hihat kick+snare+hihat hihat kick+hihat openhat+snare hihat").bank("909").gain(0.9).loop()
)`;

it("renders the Space Heater arrangement with the real Tone offline engine", async () => {
    const pattern = compile(spaceHeater);
    const blob = await renderOgg(pattern, {
        bpm: 168,
        cache: false,
    });

    expect(blob.type).toBe("audio/ogg; codecs=vorbis");
    expect(blob.size).toBeGreaterThan(1000);
});
