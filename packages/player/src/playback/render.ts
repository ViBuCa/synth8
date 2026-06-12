import * as Tone from "tone";
import type { Pattern } from "@vibuca/synth8-core";
import { getLayers } from "./layers";
import { scheduleLayers } from "./scheduler";

export type RenderOptions = {
    bpm?: number;
};

const DEFAULT_BPM = 120;

export const renderToAudioBuffer = async (
    pattern: Pattern,
    options: RenderOptions = {}
): Promise<AudioBuffer> => {
    const bpm = options.bpm ?? DEFAULT_BPM;
    const secondsPerBeat = 60 / bpm;
    const duration = pattern.length * secondsPerBeat;
    const layers = getLayers(pattern);
    const buffer = await Tone.Offline(({ transport }) => {
        const output = new Tone.Gain(1);

        output.toDestination();
        transport.bpm.value = bpm;
        scheduleLayers(layers, secondsPerBeat, () => undefined, transport, output);
        transport.start(0);
    }, duration);
    const audioBuffer = buffer.get();

    if (!audioBuffer) {
        throw new Error("Rendered audio buffer is empty.");
    }

    return audioBuffer;
};

const writeString = (view: DataView, offset: number, value: string): void => {
    for (let index = 0; index < value.length; index++) {
        view.setUint8(offset + index, value.charCodeAt(index));
    }
};

export const encodeWav = (audioBuffer: AudioBuffer): Blob => {
    const channels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const bytesPerSample = 2;
    const blockAlign = channels * bytesPerSample;
    const dataSize = audioBuffer.length * blockAlign;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);
    let offset = 0;

    writeString(view, offset, "RIFF");
    offset += 4;
    view.setUint32(offset, 36 + dataSize, true);
    offset += 4;
    writeString(view, offset, "WAVE");
    offset += 4;
    writeString(view, offset, "fmt ");
    offset += 4;
    view.setUint32(offset, 16, true);
    offset += 4;
    view.setUint16(offset, 1, true);
    offset += 2;
    view.setUint16(offset, channels, true);
    offset += 2;
    view.setUint32(offset, sampleRate, true);
    offset += 4;
    view.setUint32(offset, sampleRate * blockAlign, true);
    offset += 4;
    view.setUint16(offset, blockAlign, true);
    offset += 2;
    view.setUint16(offset, bytesPerSample * 8, true);
    offset += 2;
    writeString(view, offset, "data");
    offset += 4;
    view.setUint32(offset, dataSize, true);
    offset += 4;

    const channelData = Array.from({ length: channels }, (_, channel) =>
        audioBuffer.getChannelData(channel)
    );

    for (let sample = 0; sample < audioBuffer.length; sample++) {
        for (let channel = 0; channel < channels; channel++) {
            const value = Math.max(-1, Math.min(1, channelData[channel][sample]));
            const pcm = value < 0 ? value * 0x8000 : value * 0x7fff;

            view.setInt16(offset, pcm, true);
            offset += bytesPerSample;
        }
    }

    return new Blob([buffer], { type: "audio/wav" });
};

export const renderWav = async (
    pattern: Pattern,
    options: RenderOptions = {}
): Promise<Blob> => encodeWav(await renderToAudioBuffer(pattern, options));

