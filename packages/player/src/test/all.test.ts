import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Pattern } from "@vibuca/synth8-core";

const scheduledCallbacks: Array<{ callback: (time: number) => void; time: number }> = [];

const transport = {
    stop: vi.fn(),
    cancel: vi.fn(),
    start: vi.fn(),
    schedule: vi.fn((callback: (time: number) => void, time: number) => {
        scheduledCallbacks.push({ callback, time });
    }),
    bpm: { value: 120 },
    loop: false,
    loopStart: 0,
    loopEnd: 0,
};

const triggerAttackRelease = vi.fn();
const connect = vi.fn(function (this: unknown) {
    return this;
});
const dispose = vi.fn();

vi.mock("tone", () => {
    class Gain {
        value: number;

        constructor(value: number) {
            this.value = value;
        }

        toDestination = vi.fn(() => this);
        connect = connect;
        dispose = dispose;
    }

    class PolySynth {
        options: unknown;

        constructor(_synth: unknown, options: unknown) {
            this.options = options;
        }

        connect = connect;
        triggerAttackRelease = triggerAttackRelease;
        dispose = dispose;
    }

    class Synth { }

    return {
        start: vi.fn(() => Promise.resolve()),
        getTransport: vi.fn(() => transport),
        Gain,
        PolySynth,
        Synth,
    };
});

const drumTriggerAttackRelease = vi.fn();
const drumConnect = vi.fn();
const drumDispose = vi.fn();

vi.mock("./drum/drum-synths", () => ({
    createDrums: vi.fn(() => ({
        kick: { triggerAttackRelease: drumTriggerAttackRelease },
        snare: { triggerAttackRelease: drumTriggerAttackRelease },
        clap: { triggerAttackRelease: drumTriggerAttackRelease },
        hihat: { triggerAttackRelease: drumTriggerAttackRelease },
        openhat: { triggerAttackRelease: drumTriggerAttackRelease },
        midtom: { triggerAttackRelease: drumTriggerAttackRelease },
        lowtom: { triggerAttackRelease: drumTriggerAttackRelease },
        hitom: { triggerAttackRelease: drumTriggerAttackRelease },
        rim: { triggerAttackRelease: drumTriggerAttackRelease },
        cowbell: { triggerAttackRelease: drumTriggerAttackRelease },
        crash: { triggerAttackRelease: drumTriggerAttackRelease },
        ride: { triggerAttackRelease: drumTriggerAttackRelease },
        tambourine: { triggerAttackRelease: drumTriggerAttackRelease },
        shaker: { triggerAttackRelease: drumTriggerAttackRelease },
        connect: drumConnect,
        dispose: drumDispose,
    })),
}));

describe("player", () => {
    beforeEach(() => {
        vi.clearAllMocks();

        scheduledCallbacks.length = 0;

        transport.bpm.value = 120;
        transport.loop = false;
        transport.loopStart = 0;
        transport.loopEnd = 0;
    });

    it("configures the transport from pattern length and bpm", async () => {
        const { play } = await import("../index");

        const pattern: Pattern = {
            length: 4,
            loopLength: 4,
            loop: false,
            events: [],
            layers: [],
        };

        await play(pattern, { bpm: 60 });

        expect(transport.stop).toHaveBeenCalled();
        expect(transport.cancel).toHaveBeenCalled();
        expect(transport.bpm.value).toBe(60);
        expect(transport.loop).toBe(true);
        expect(transport.loopStart).toBe(0);
        expect(transport.loopEnd).toBe(4);
        expect(transport.start).toHaveBeenCalled();
    });

    it("schedules note events in seconds", async () => {
        const { play } = await import("../index");

        const pattern: Pattern = {
            length: 4,
            loopLength: 4,
            loop: false,
            events: [
                {
                    type: "note",
                    value: "c4",
                    time: 1,
                    dur: 0.5,
                    velocity: 0.7,
                },
            ],
            layers: [],
        };

        await play(pattern, { bpm: 120 });

        expect(transport.schedule).toHaveBeenCalledTimes(1);
        expect(scheduledCallbacks[0].time).toBe(0.5);

        scheduledCallbacks[0].callback(123);

        expect(triggerAttackRelease).toHaveBeenCalledWith("c4", 0.25, 123, 0.7);
    });

    it("uses default note velocity when none is provided", async () => {
        const { play } = await import("../index");

        const pattern: Pattern = {
            length: 1,
            loopLength: 1,
            loop: false,
            events: [
                {
                    type: "note",
                    value: "d4",
                    time: 0,
                    dur: 1,
                },
            ],
            layers: [],
        };

        await play(pattern);

        scheduledCallbacks[0].callback(10);

        expect(triggerAttackRelease).toHaveBeenCalledWith("d4", 0.5, 10, 0.8);
    });

    it("schedules drum events and uses event velocity", async () => {
        const { play } = await import("../index");

        const pattern: Pattern = {
            length: 2,
            loopLength: 2,
            loop: false,
            events: [
                {
                    type: "drum",
                    value: "kick",
                    time: 1,
                    dur: 1,
                    velocity: 0.6,
                },
            ],
            layers: [],
        };

        await play(pattern, { bpm: 120 });

        expect(scheduledCallbacks[0].time).toBe(0.5);

        scheduledCallbacks[0].callback(42);

        expect(drumTriggerAttackRelease).toHaveBeenCalledWith("C1", "8n", 42, 0.6);
    });

    it("uses default drum velocity when none is provided", async () => {
        const { play } = await import("../index");

        const pattern: Pattern = {
            length: 1,
            loopLength: 1,
            loop: false,
            events: [
                {
                    type: "drum",
                    value: "snare",
                    time: 0,
                    dur: 1,
                },
            ],
            layers: [],
        };

        await play(pattern);

        scheduledCallbacks[0].callback(5);

        expect(drumTriggerAttackRelease).toHaveBeenCalledWith("16n", 5, 1);
    });

    it("uses pattern layers when present", async () => {
        const { play } = await import("../index");

        const pattern: Pattern = {
            length: 2,
            loopLength: 2,
            loop: false,
            events: [],
            layers: [
                {
                    playback: {
                        sound: "triangle",
                        gain: 0.5,
                    },
                    events: [
                        {
                            type: "note",
                            value: "e4",
                            time: 0,
                            dur: 1,
                        },
                    ],
                },
            ],
        };

        await play(pattern);

        expect(transport.schedule).toHaveBeenCalledTimes(1);

        scheduledCallbacks[0].callback(1);

        expect(triggerAttackRelease).toHaveBeenCalledWith("e4", 0.5, 1, 0.8);
        expect(drumConnect).toHaveBeenCalled();
    });

    it("falls back to top-level events when no layers exist", async () => {
        const { play } = await import("../index");

        const pattern: Pattern = {
            length: 1,
            loopLength: 1,
            loop: false,
            events: [
                {
                    type: "note",
                    value: "g4",
                    time: 0,
                    dur: 1,
                },
            ],
            layers: [],
        };

        await play(pattern);

        expect(transport.schedule).toHaveBeenCalledTimes(1);
    });

    it("stops, cancels, disables loop and disposes active nodes", async () => {
        const { play, stop } = await import("../index");

        const pattern: Pattern = {
            length: 1,
            loopLength: 1,
            loop: false,
            events: [
                {
                    type: "note",
                    value: "c4",
                    time: 0,
                    dur: 1,
                },
            ],
            layers: [],
        };

        await play(pattern);
        stop();

        expect(transport.stop).toHaveBeenCalled();
        expect(transport.cancel).toHaveBeenCalled();
        expect(transport.loop).toBe(false);
        expect(dispose).toHaveBeenCalled();
        expect(drumDispose).toHaveBeenCalled();
    });
});