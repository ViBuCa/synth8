import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Pattern } from "@vibuca/synth8-core";

const scheduledCallbacks: Array<{ callback: (time: number) => void; time: number }> = [];

const transport = {
    stop: vi.fn(),
    cancel: vi.fn(),
    pause: vi.fn(),
    start: vi.fn(),
    schedule: vi.fn((callback: (time: number) => void, time: number) => {
        scheduledCallbacks.push({ callback, time });
    }),
    bpm: { value: 120 },
    loop: false,
    loopStart: 0,
    loopEnd: 0,
};
const context = {
    lookAhead: 0.1,
    updateInterval: 0.05,
    sampleRate: 100,
};

const triggerAttackRelease = vi.fn();
const connect = vi.fn(function (this: unknown) {
    return this;
});
const dispose = vi.fn();
const playerStart = vi.fn();
const playerStop = vi.fn();
const playerConnect = vi.fn(function (this: unknown) {
    return this;
});
const playerToDestination = vi.fn(function (this: unknown) {
    return this;
});
const playerInstances: Array<{
    buffer: unknown;
    loop: boolean;
    loopStart: number;
    loopEnd: number;
    playbackRate: number;
}> = [];
const renderedAudioBuffer = {
    numberOfChannels: 2,
    sampleRate: 44100,
    length: 2,
    getChannelData: vi.fn((channel: number) =>
        channel === 0
            ? new Float32Array([-1, 0.5])
            : new Float32Array([1, 0])
    ),
};
const renderedToneBuffer = {
    get: vi.fn(() => renderedAudioBuffer),
};
const gainParamSetValueAtTime = vi.fn(function (
    this: { value: number },
    value: number
) {
    this.value = value;
});
const gainInstances: Array<{ gain: { value: number } }> = [];
const polySynthInstances: Array<{ options: unknown }> = [];
const filterInstances: Array<{ frequency: unknown; type: unknown }> = [];
const feedbackDelayInstances: Array<{ delayTime: unknown; feedback: unknown }> = [];
const freeverbInstances: Array<{ roomSize: unknown; dampening: unknown }> = [];
const reverbInstances: Array<{ options: unknown }> = [];
const distortionInstances: Array<{ distortion: unknown }> = [];
const chorusInstances: Array<{ frequency: unknown; delayTime: unknown; depth: unknown }> = [];
const offline = vi.fn(async (callback: (context: { transport: typeof transport }) => void) => {
    callback({ transport });
    return renderedToneBuffer;
});

vi.mock("tone", () => {
    class Gain {
        value: number;
        gain: {
            value: number;
            cancelScheduledValues: ReturnType<typeof vi.fn>;
            setValueAtTime: typeof gainParamSetValueAtTime;
        };

        constructor(value: number) {
            this.value = value;
            this.gain = {
                value,
                cancelScheduledValues: vi.fn(),
                setValueAtTime: gainParamSetValueAtTime,
            };
            gainInstances.push(this);
        }

        toDestination = vi.fn(() => this);
        connect = connect;
        dispose = dispose;
    }

    class Panner {
        value: number;

        constructor(value: number) {
            this.value = value;
        }

        toDestination = vi.fn(() => this);
        connect = connect;
        dispose = dispose;
    }

    class Limiter {
        threshold: number;

        constructor(threshold: number) {
            this.threshold = threshold;
        }

        toDestination = vi.fn(() => this);
        connect = connect;
        dispose = dispose;
    }

    class Filter {
        frequency: unknown;
        type: unknown;

        constructor(frequency: unknown, type: unknown) {
            this.frequency = frequency;
            this.type = type;
            filterInstances.push(this);
        }

        toDestination = vi.fn(() => this);
        connect = connect;
        dispose = dispose;
    }

    class FeedbackDelay {
        delayTime: unknown;
        feedback: unknown;

        constructor(delayTime: unknown, feedback: unknown) {
            this.delayTime = delayTime;
            this.feedback = feedback;
            feedbackDelayInstances.push(this);
        }

        toDestination = vi.fn(() => this);
        connect = connect;
        dispose = dispose;
    }

    class Freeverb {
        roomSize: unknown;
        dampening: unknown;

        constructor(roomSize: unknown, dampening: unknown) {
            this.roomSize = roomSize;
            this.dampening = dampening;
            freeverbInstances.push(this);
        }

        toDestination = vi.fn(() => this);
        connect = connect;
        dispose = dispose;
    }

    class Reverb {
        options: unknown;

        constructor(options: unknown) {
            this.options = options;
            reverbInstances.push(this);
        }

        toDestination = vi.fn(() => this);
        connect = connect;
        dispose = dispose;
    }

    class Distortion {
        distortion: unknown;

        constructor(distortion: unknown) {
            this.distortion = distortion;
            distortionInstances.push(this);
        }

        toDestination = vi.fn(() => this);
        connect = connect;
        dispose = dispose;
    }

    class Chorus {
        frequency: unknown;
        delayTime: unknown;
        depth: unknown;

        constructor(frequency: unknown, delayTime: unknown, depth: unknown) {
            this.frequency = frequency;
            this.delayTime = delayTime;
            this.depth = depth;
            chorusInstances.push(this);
        }

        start = vi.fn(() => this);
        toDestination = vi.fn(() => this);
        connect = connect;
        dispose = dispose;
    }

    class PolySynth {
        options: unknown;

        constructor(_synth: unknown, options: unknown) {
            this.options = options;
            polySynthInstances.push(this);
        }

        connect = connect;
        triggerAttackRelease = triggerAttackRelease;
        dispose = dispose;
    }

    class Synth { }

    class Player {
        buffer: unknown;
        loop = false;
        loopStart = 0;
        loopEnd = 0;
        playbackRate = 1;
        volume = { value: 0 };

        constructor(buffer: unknown) {
            this.buffer = buffer;
            playerInstances.push(this);
        }

        toDestination = playerToDestination;
        connect = playerConnect;
        start = playerStart;
        stop = playerStop;
        dispose = dispose;
    }

    return {
        start: vi.fn(() => Promise.resolve()),
        immediate: vi.fn(() => 0),
        getTransport: vi.fn(() => transport),
        getContext: vi.fn(() => context),
        now: vi.fn(() => 0),
        Offline: offline,
        Gain,
        Panner,
        Player,
        Limiter,
        Filter,
        FeedbackDelay,
        Freeverb,
        Reverb,
        Distortion,
        Chorus,
        PolySynth,
        Synth,
        gainToDb: vi.fn((value: number) => value),
    };
});

const drumTriggerAttackRelease = vi.fn();
const drumConnect = vi.fn();
const drumDispose = vi.fn();
const createDrums = vi.fn(() => ({
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
}));

vi.mock("../drum", async (importOriginal) => ({
    ...(await importOriginal<typeof import("../drum")>()),
    createDrums,
}));

describe("player", () => {
    beforeEach(async () => {
        const { clearPlaybackSession } = await import("../playback/session");
        const { clearRenderCache } = await import("../index");

        clearPlaybackSession();
        clearRenderCache();
        vi.clearAllMocks();

        scheduledCallbacks.length = 0;
        playerInstances.length = 0;
        gainInstances.length = 0;
        polySynthInstances.length = 0;
        filterInstances.length = 0;
        feedbackDelayInstances.length = 0;
        freeverbInstances.length = 0;
        reverbInstances.length = 0;
        distortionInstances.length = 0;
        chorusInstances.length = 0;
        renderedToneBuffer.get.mockClear();
        renderedAudioBuffer.getChannelData.mockClear();

        transport.bpm.value = 120;
        transport.loop = false;
        transport.loopStart = 0;
        transport.loopEnd = 0;
        context.lookAhead = 0.1;
        context.updateInterval = 0.05;
        context.sampleRate = 100;
    });

    it("renders playback to a looping buffer by default", async () => {
        const { play } = await import("../index");

        const pattern: Pattern = {
            length: 4,
            loopLength: 4,
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

        await play(pattern, { bpm: 60 });

        expect(offline).toHaveBeenCalledWith(expect.any(Function), 4, 2, 100);
        expect(playerInstances.find((player) => player.loop)).toMatchObject({
            buffer: renderedAudioBuffer,
            loop: true,
            loopStart: 0,
            loopEnd: 4,
        });
        expect(playerToDestination).toHaveBeenCalled();
        expect(playerStart).toHaveBeenCalled();
        expect(transport.loop).toBe(false);
    });

    it("prepares rendered playback without starting it", async () => {
        const { prepare } = await import("../index");

        const pattern: Pattern = {
            length: 1,
            loopLength: 1,
            loop: false,
            events: [],
            layers: [],
        };

        const playback = await prepare(pattern, { playbackMode: "rendered" });

        expect(playback.playbackMode).toBe("rendered");
        expect(playerStart).not.toHaveBeenCalled();

        playback.start();

        expect(playerStart).toHaveBeenCalled();
    });

    it("calls onReady before starting playback", async () => {
        const { play } = await import("../index");
        const calls: string[] = [];

        playerStart.mockImplementationOnce(() => {
            calls.push("start");
        });

        const pattern: Pattern = {
            length: 1,
            loopLength: 1,
            loop: false,
            events: [],
            layers: [],
        };

        await play(pattern, {
            playbackMode: "rendered",
            onReady: () => {
                calls.push("ready");
            },
        });

        expect(calls).toEqual(["ready", "start"]);
    });

    it("uses live playback for dense patterns in auto mode", async () => {
        const { play } = await import("../index");

        const events = Array.from({ length: 513 }, (_, index) => ({
            type: "note" as const,
            value: "c4",
            time: index / 16,
            dur: 0.25,
        }));

        const pattern: Pattern = {
            length: 64,
            loopLength: 64,
            loop: false,
            events,
            layers: [],
        };

        await play(pattern);

        expect(offline).not.toHaveBeenCalled();
        expect(transport.loop).toBe(true);
        expect(transport.start).toHaveBeenCalled();
    });

    it("prepares streamed playback from an initial audio chunk", async () => {
        const { prepare } = await import("../index");

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

        const playback = await prepare(pattern, {
            bpm: 60,
            playbackMode: "streamed",
            streamChunkDuration: 5,
        });

        expect(playback.playbackMode).toBe("streamed");
        expect(offline).toHaveBeenCalledWith(expect.any(Function), 1.25, 2, 100);
        expect(playerStart).not.toHaveBeenCalled();

        playback.start();

        expect(playerInstances.find((player) => player.loop)).toMatchObject({
            buffer: renderedAudioBuffer,
            loop: true,
            loopStart: 0,
            loopEnd: 1,
        });
        expect(playerStart).toHaveBeenCalledWith(0);
    });

    it("schedules rendered note and drum events during offline rendering", async () => {
        const { play } = await import("../index");

        const pattern: Pattern = {
            length: 2,
            loopLength: 2,
            loop: false,
            events: [
                {
                    type: "note",
                    value: "c4",
                    time: 0.5,
                    dur: 0.5,
                    velocity: 0.6,
                },
                {
                    type: "drum",
                    value: "snare",
                    time: 1,
                    dur: 1,
                    velocity: 0.7,
                },
            ],
            layers: [],
        };

        await play(pattern, { bpm: 120 });

        expect(scheduledCallbacks).toHaveLength(2);
        expect(scheduledCallbacks[0].time).toBe(0.25);
        expect(scheduledCallbacks[1].time).toBe(0.5);
        expect(createDrums).toHaveBeenCalledWith(["snare"]);

        scheduledCallbacks[0].callback(10);
        scheduledCallbacks[1].callback(11);

        expect(triggerAttackRelease).toHaveBeenCalledWith("c4", 0.25, 10, 0.6);
        expect(drumTriggerAttackRelease).toHaveBeenCalledWith("16n", 11, 0.7);
    });

    it("pauses and resumes rendered playback from the current loop offset", async () => {
        const Tone = await import("tone");
        const { pause, play, resume } = await import("../index");

        vi.mocked(Tone.immediate).mockReturnValueOnce(0).mockReturnValueOnce(1.25).mockReturnValueOnce(1.25);

        const pattern: Pattern = {
            length: 4,
            loopLength: 4,
            loop: false,
            events: [],
            layers: [],
        };

        await play(pattern, { bpm: 60 });
        pause();
        resume();

        expect(playerStop).toHaveBeenCalled();
        expect(playerStart).toHaveBeenLastCalledWith(undefined, 1.25);
    });

    it("does not stop rendered playback twice when pause is repeated", async () => {
        const Tone = await import("tone");
        const { pause, play } = await import("../index");

        vi.mocked(Tone.immediate).mockReturnValueOnce(0).mockReturnValueOnce(0.75);

        const pattern: Pattern = {
            length: 2,
            loopLength: 2,
            loop: false,
            events: [],
            layers: [],
        };

        await play(pattern, { bpm: 60 });
        pause();
        pause();

        expect(playerStop).toHaveBeenCalledTimes(1);
    });

    it("does not restart rendered playback when resume is repeated", async () => {
        const Tone = await import("tone");
        const { pause, play, resume } = await import("../index");

        vi.mocked(Tone.immediate).mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValueOnce(0.5);

        const pattern: Pattern = {
            length: 2,
            loopLength: 2,
            loop: false,
            events: [],
            layers: [],
        };

        await play(pattern, { bpm: 60 });
        pause();
        resume();
        resume();

        expect(playerStart).toHaveBeenCalledTimes(2);
        expect(playerStart).toHaveBeenLastCalledWith(undefined, 0.5);
    });

    it("pauses and resumes live playback through the transport", async () => {
        const { pause, play, resume } = await import("../index");

        const pattern: Pattern = {
            length: 1,
            loopLength: 1,
            loop: false,
            events: [],
            layers: [],
        };

        await play(pattern, { playbackMode: "live" });
        pause();
        resume();

        expect(transport.pause).toHaveBeenCalled();
        expect(transport.start).toHaveBeenCalledTimes(2);
    });

    it("does nothing when pause and resume are called without playback", async () => {
        const { pause, resume } = await import("../index");

        pause();
        resume();

        expect(playerStop).not.toHaveBeenCalled();
        expect(playerStart).not.toHaveBeenCalled();
        expect(transport.pause).not.toHaveBeenCalled();
        expect(transport.start).not.toHaveBeenCalled();
    });

    it("clears rendered pause state when stopped", async () => {
        const Tone = await import("tone");
        const { pause, play, resume, stop } = await import("../index");

        vi.mocked(Tone.immediate).mockReturnValueOnce(0).mockReturnValueOnce(0.5);

        const pattern: Pattern = {
            length: 2,
            loopLength: 2,
            loop: false,
            events: [],
            layers: [],
        };

        await play(pattern, { bpm: 60 });
        pause();
        stop();
        resume();

        expect(playerStop).toHaveBeenCalledTimes(1);
        expect(playerStart).toHaveBeenCalledTimes(1);
    });

    it("disposes previous playback when play is called again", async () => {
        const { play } = await import("../index");

        const pattern: Pattern = {
            length: 1,
            loopLength: 1,
            loop: false,
            events: [],
            layers: [],
        };

        await play(pattern);
        await play(pattern);

        expect(dispose).toHaveBeenCalled();
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

        await play(pattern, { bpm: 60, playbackMode: "live" });

        expect(transport.stop).toHaveBeenCalled();
        expect(transport.cancel).toHaveBeenCalled();
        expect(transport.bpm.value).toBe(60);
        expect(transport.loop).toBe(true);
        expect(transport.loopStart).toBe(0);
        expect(transport.loopEnd).toBe(4);
        expect(context.lookAhead).toBe(0.25);
        expect(transport.start).toHaveBeenCalled();
    });

    it("allows playback scheduling options to be tuned", async () => {
        const { play } = await import("../index");

        const pattern: Pattern = {
            length: 1,
            loopLength: 1,
            loop: false,
            events: [],
            layers: [],
        };

        await play(pattern, { lookAhead: 0.4, updateInterval: 0.2, playbackMode: "live" });

        expect(context.lookAhead).toBe(0.4);
        expect(context.updateInterval).toBe(0.2);
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

        await play(pattern, { bpm: 120, playbackMode: "live" });

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

        await play(pattern, { playbackMode: "live" });

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

        await play(pattern, { bpm: 120, playbackMode: "live" });

        expect(scheduledCallbacks[0].time).toBe(0.5);
        expect(createDrums).toHaveBeenCalledWith(["kick"]);

        scheduledCallbacks[0].callback(42);

        expect(drumTriggerAttackRelease).toHaveBeenCalledWith("C1", "8n", 42, 0.6);
    });

    it("passes layer bank to drum creation", async () => {
        const { play } = await import("../index");

        const pattern: Pattern = {
            length: 1,
            loopLength: 1,
            loop: false,
            events: [],
            layers: [
                {
                    playback: {
                        bank: "arcade",
                    },
                    events: [
                        {
                            type: "drum",
                            value: "kick",
                            time: 0,
                            dur: 1,
                        },
                    ],
                },
            ],
        };

        await play(pattern, { playbackMode: "live" });

        expect(createDrums).toHaveBeenCalledWith(["kick"], "arcade");
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

        await play(pattern, { playbackMode: "live" });

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

        await play(pattern, { playbackMode: "live" });

        expect(transport.schedule).toHaveBeenCalledTimes(1);

        scheduledCallbacks[0].callback(1);

        expect(triggerAttackRelease).toHaveBeenCalledWith("e4", 0.5, 1, 0.8);
        expect(createDrums).not.toHaveBeenCalled();
        expect(drumConnect).not.toHaveBeenCalled();
    });

    it("passes layer envelope config to note synths", async () => {
        const { play } = await import("../index");

        const pattern: Pattern = {
            length: 1,
            loopLength: 1,
            loop: false,
            events: [],
            layers: [
                {
                    playback: {
                        sound: "square",
                        envelope: {
                            attack: 0.01,
                            decay: 0.2,
                            sustain: 0.6,
                            release: 0.4,
                        },
                    },
                    events: [
                        {
                            type: "note",
                            value: "c4",
                            time: 0,
                            dur: 1,
                        },
                    ],
                },
            ],
        };

        await play(pattern, { playbackMode: "live" });

        expect(polySynthInstances[0].options).toEqual({
            oscillator: {
                type: "square",
            },
            envelope: {
                attack: 0.01,
                decay: 0.2,
                sustain: 0.6,
                release: 0.4,
            },
        });
    });

    it("resolves melody preset defaults and explicit envelope overrides", async () => {
        const { play } = await import("../index");

        const pattern: Pattern = {
            length: 1,
            loopLength: 1,
            loop: false,
            events: [],
            layers: [
                {
                    playback: {
                        preset: "chip-lead",
                        envelope: {
                            release: 0.2,
                        },
                    },
                    events: [
                        {
                            type: "note",
                            value: "c4",
                            time: 0,
                            dur: 1,
                        },
                    ],
                },
            ],
        };

        await play(pattern, { playbackMode: "live" });

        expect(polySynthInstances[0].options).toEqual({
            oscillator: {
                type: "square",
            },
            envelope: {
                attack: 0.005,
                decay: 0.08,
                sustain: 0.65,
                release: 0.2,
            },
        });
    });

    it("resolves soft pad preset defaults", async () => {
        const { play } = await import("../index");

        const pattern: Pattern = {
            length: 1,
            loopLength: 1,
            loop: false,
            events: [],
            layers: [
                {
                    playback: {
                        preset: "soft-pad",
                    },
                    events: [
                        {
                            type: "note",
                            value: "c4",
                            time: 0,
                            dur: 1,
                        },
                    ],
                },
            ],
        };

        await play(pattern, { playbackMode: "live" });

        expect(polySynthInstances[0].options).toEqual({
            oscillator: {
                type: "triangle",
            },
            envelope: {
                attack: 0.35,
                decay: 0.25,
                sustain: 0.75,
                release: 0.9,
            },
        });
        expect(gainInstances[0].gain.value).toBe(0.7);
    });

    it("resolves chip bass as a round triangle bass preset", async () => {
        const { play } = await import("../index");

        const pattern: Pattern = {
            length: 1,
            loopLength: 1,
            loop: false,
            events: [],
            layers: [
                {
                    playback: {
                        preset: "chip-bass",
                    },
                    events: [
                        {
                            type: "note",
                            value: "c2",
                            time: 0,
                            dur: 1,
                        },
                    ],
                },
            ],
        };

        await play(pattern, { playbackMode: "live" });

        expect(polySynthInstances[0].options).toEqual({
            oscillator: {
                type: "triangle",
            },
            envelope: {
                attack: 0.001,
                decay: 0.05,
                sustain: 0.75,
                release: 0.04,
            },
        });
        expect(gainInstances[0].gain.value).toBe(0.9);
    });

    it("creates effect nodes for layer effects", async () => {
        const { play } = await import("../index");

        const pattern: Pattern = {
            length: 1,
            loopLength: 1,
            loop: false,
            events: [],
            layers: [
                {
                    playback: {
                        effects: {
                            lowpass: 1200,
                            highpass: 120,
                            distortion: 0.25,
                            chorus: 0.6,
                            delay: 0.2,
                            echo: 0.35,
                            room: 0.4,
                            reverb: 0.5,
                        },
                    },
                    events: [
                        {
                            type: "note",
                            value: "c4",
                            time: 0,
                            dur: 1,
                        },
                    ],
                },
            ],
        };

        await play(pattern, { playbackMode: "live" });

        expect(filterInstances).toMatchObject([
            { frequency: 1200, type: "lowpass" },
            { frequency: 120, type: "highpass" },
        ]);
        expect(distortionInstances[0].distortion).toBe(0.25);
        expect(chorusInstances[0]).toMatchObject({
            frequency: 4,
            delayTime: 2.5,
            depth: 0.6,
        });
        expect(feedbackDelayInstances).toMatchObject([
            { delayTime: 0.2, feedback: 0.15 },
            { delayTime: 0.25, feedback: 0.35 },
        ]);
        expect(freeverbInstances[0]).toMatchObject({
            roomSize: 0.4,
            dampening: 2500,
        });
        expect(reverbInstances[0].options).toEqual({
            decay: 2.2,
            preDelay: 0.01,
            wet: 0.5,
        });
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

        await play(pattern, { playbackMode: "live" });

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
                {
                    type: "drum",
                    value: "kick",
                    time: 0,
                    dur: 1,
                },
            ],
            layers: [],
        };

        await play(pattern, { playbackMode: "live" });
        stop();

        expect(transport.stop).toHaveBeenCalled();
        expect(transport.cancel).toHaveBeenCalled();
        expect(transport.loop).toBe(false);
        expect(dispose).toHaveBeenCalled();
        expect(drumDispose).toHaveBeenCalled();
    });

    it("plays streamed game music and overlapping sfx without replacing music", async () => {
        const { createGameAudio } = await import("../index");

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

        const audio = await createGameAudio();
        const music = await audio.prepareMusic(pattern, { bpm: 60 });
        const sfx = await audio.prepareSfx(pattern, { bpm: 120, voices: 2 });

        music.start();
        await Promise.resolve();
        audio.playSfx(sfx);
        audio.playSfx(sfx);

        expect(playerInstances).toHaveLength(3);
        expect(playerInstances.find((player) => player.loop)).toMatchObject({
            buffer: renderedAudioBuffer,
            loop: true,
            loopStart: 0,
            loopEnd: 1,
        });
        expect(playerStart).toHaveBeenCalledTimes(3);
        expect(playerConnect).toHaveBeenCalled();
        expect(transport.cancel).not.toHaveBeenCalled();
        expect(dispose).not.toHaveBeenCalled();
    });

    it("can prepare rendered game music explicitly", async () => {
        const { createGameAudio } = await import("../index");

        const pattern: Pattern = {
            length: 1,
            loopLength: 1,
            loop: false,
            events: [],
            layers: [],
        };

        const audio = await createGameAudio();
        const music = await audio.prepareMusic(pattern, { playbackMode: "rendered" });

        expect(music.playbackMode).toBe("rendered");
    });

    it("routes rendered game music through the music bus", async () => {
        const { createGameAudio } = await import("../index");

        const pattern: Pattern = {
            length: 1,
            loopLength: 1,
            loop: false,
            events: [],
            layers: [],
        };

        const audio = await createGameAudio();

        await audio.prepareMusic(pattern, { playbackMode: "rendered" });

        expect(playerConnect).toHaveBeenCalledWith(gainInstances[1]);
        expect(playerToDestination).not.toHaveBeenCalled();
    });

    it("prepares replacement game music without stopping the current music", async () => {
        const { createGameAudio } = await import("../index");

        const pattern: Pattern = {
            length: 1,
            loopLength: 1,
            loop: false,
            events: [],
            layers: [],
        };

        const audio = await createGameAudio();
        const firstMusic = await audio.prepareMusic(pattern);

        firstMusic.start();
        await audio.prepareMusic(pattern);

        expect(playerStop).not.toHaveBeenCalled();
        expect(dispose).not.toHaveBeenCalled();
    });

    it("cycles sfx voices and applies per-play options", async () => {
        const { createGameAudio } = await import("../index");

        const pattern: Pattern = {
            length: 1,
            loopLength: 1,
            loop: false,
            events: [],
            layers: [],
        };

        const audio = await createGameAudio();
        const sfx = await audio.prepareSfx(pattern, { voices: 1 });

        audio.playSfx(sfx, { playbackRate: 1.5, volume: 0.5 });
        audio.playSfx(sfx);

        expect(playerInstances[0]).toMatchObject({
            playbackRate: 1,
            volume: { value: 1 },
        });
        expect(playerStop).toHaveBeenCalled();
        expect(playerStart).toHaveBeenCalled();
    });

    it("updates game audio volumes at runtime", async () => {
        const { createGameAudio } = await import("../index");

        const audio = await createGameAudio({
            masterVolume: 1,
            musicVolume: 0.75,
            sfxVolume: 0.5,
        });

        audio.setMasterVolume(0);
        audio.setMusicVolume(0.25);
        audio.setSfxVolume(1.2);

        expect(gainInstances[0].gain.value).toBe(0);
        expect(gainInstances[1].gain.value).toBe(0.25);
        expect(gainInstances[2].gain.value).toBe(1.2);
        expect(gainParamSetValueAtTime).toHaveBeenCalledTimes(3);
    });

    it("renders patterns to audio buffers", async () => {
        const { renderToAudioBuffer } = await import("../index");

        const pattern: Pattern = {
            length: 2,
            loopLength: 2,
            loop: false,
            events: [],
            layers: [],
        };

        const buffer = await renderToAudioBuffer(pattern, { bpm: 60 });

        expect(offline).toHaveBeenCalledWith(expect.any(Function), 2, 2, 100);
        expect(buffer).toBe(renderedAudioBuffer);
    });

    it("reuses cached rendered audio buffers for matching patterns and bpm", async () => {
        const { renderToAudioBuffer } = await import("../index");

        const pattern: Pattern = {
            length: 2,
            loopLength: 2,
            loop: false,
            events: [],
            layers: [],
        };

        const first = await renderToAudioBuffer(pattern, { bpm: 60 });
        const second = await renderToAudioBuffer(pattern, { bpm: 60 });

        expect(first).toBe(second);
        expect(offline).toHaveBeenCalledTimes(1);
    });

    it("encodes audio buffers as wav blobs", async () => {
        const { encodeWav } = await import("../index");

        const blob = encodeWav(renderedAudioBuffer as unknown as AudioBuffer);
        const bytes = new Uint8Array(await blob.arrayBuffer());

        expect(blob.type).toBe("audio/wav");
        expect(blob.size).toBe(44 + renderedAudioBuffer.length * renderedAudioBuffer.numberOfChannels * 2);
        expect(new TextDecoder().decode(bytes.slice(0, 4))).toBe("RIFF");
        expect(new TextDecoder().decode(bytes.slice(8, 12))).toBe("WAVE");
    });
});
