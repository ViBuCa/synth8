import { expect, it } from "vitest";
import { createMidiBuffer } from "./testhelper";
import { normalizeSource } from "../exporter/test-helper";
import { midiToSynth8Source } from "../../exporter/exporter";
import { parseMidi } from "../../parser";

it("supports split piano, drum mapping, durations, and track order together", () => {
    const buffer = createMidiBuffer([
        { track: "piano", midi: 72, time: 0, duration: 0.5 },
        { track: "piano", midi: 48, time: 0, duration: 0.25 },
        { track: "drums", midi: 36, time: 0, duration: 0.25 },
        { track: "drums", midi: 38, time: 0.5, duration: 0.25 },
    ]);

    const song = parseMidi(buffer);

    expect(
        normalizeSource(
            midiToSynth8Source(song, {
                step: 0.25,
                mode: "split-piano",
                mapDrums: true,
                drums: {
                    sourceTracks: ["drums"],
                },
                trackOrder: ["lead", "bass", "drums"],
            })
        )
    ).toBe(
        normalizeSource(`
      song(
        melody("c5/2").fast(4),
        melody("c3").fast(4),
        beat("kick _ snare").fast(4)
      )
    `)
    );
});