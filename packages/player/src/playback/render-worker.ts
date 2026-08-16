import * as Tone from "tone";
import type { Pattern } from "@vibuca/synth8-core";
import { getLayers } from "./layers";
import { scheduleLayers } from "./scheduler";

export type WorkerRenderRequest = {
    id: number;
    pattern: Pattern;
    bpm: number;
    channels: number;
    sampleRate: number;
    start?: number;
    duration?: number;
    tail?: number;
};

export type WorkerRenderResponse = {
    id: number;
    channels: number;
    sampleRate: number;
    length: number;
    data: Float32Array[];
    error?: string;
};

const render = async (request: WorkerRenderRequest): Promise<WorkerRenderResponse> => {
    const secondsPerBeat = 60 / request.bpm;
    const start = request.start ?? 0;
    const duration = request.duration ?? request.pattern.length * secondsPerBeat;
    const startBeat = start / secondsPerBeat;
    const endBeat = (start + duration) / secondsPerBeat;
    const layers = getLayers(request.pattern).map((layer) => ({
        playback: layer.playback,
        events: request.start === undefined
            ? layer.events
            : layer.events
                .filter((event) => event.time >= startBeat && event.time < endBeat)
                .map((event) => ({ ...event, time: event.time - startBeat })),
    }));
    const renderDuration = duration + (request.tail ?? 0);
    const buffer = await Tone.Offline(({ transport }) => {
        const output = new Tone.Gain(1);
        output.toDestination();
        transport.bpm.value = request.bpm;
        scheduleLayers(layers, secondsPerBeat, () => undefined, transport, output);
        transport.start(0);
    }, renderDuration, request.channels, request.sampleRate);
    const audioBuffer = buffer.get();
    if (!audioBuffer) throw new Error("Rendered audio buffer is empty.");

    // AudioBuffer is not reliably transferable from a worker. Transfer its channel
    // data instead; the player recreates a native buffer on the audio thread.
    const data = Array.from({ length: audioBuffer.numberOfChannels }, (_, channel) =>
        new Float32Array(audioBuffer.getChannelData(channel))
    );
    return {
        id: request.id,
        channels: audioBuffer.numberOfChannels,
        sampleRate: audioBuffer.sampleRate,
        length: audioBuffer.length,
        data,
    };
};

const scope = self as unknown as {
    onmessage: ((event: MessageEvent<WorkerRenderRequest>) => void) | null;
};
scope.onmessage = (event) => {
    void render(event.data)
        .then((response) => {
            const transfer = response.data.map((channel) => channel.buffer);
            (self as unknown as { postMessage(message: unknown, transfer?: Transferable[]): void })
                .postMessage(response, transfer as Transferable[]);
        })
        .catch((error: unknown) => {
            self.postMessage({
                id: event.data.id,
                channels: 0,
                sampleRate: event.data.sampleRate,
                length: 0,
                data: [],
                error: error instanceof Error ? error.message : String(error),
            } satisfies WorkerRenderResponse);
        });
};
