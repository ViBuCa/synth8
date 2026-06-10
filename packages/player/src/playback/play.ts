import * as Tone from 'tone';
import type { PlayOptions } from '../model';
import type { Pattern, Waveform } from '@vibuca/synth8-core';
import { getLayers } from './layers';
import { createDrums, playDrum } from '../drum';
import { createSynth } from './synth';
import { addActiveNode, addDisposable } from './lifecycle';

const DEFAULT_SOUND: Waveform = "sine";

export const play = async (
    pattern: Pattern,
    options: PlayOptions = {}
): Promise<void> => {
    const bpm = options.bpm ?? 120;

    await Tone.start();

    const transport = Tone.getTransport();

    transport.stop();
    transport.cancel();

    transport.bpm.value = bpm;

    const secondsPerBeat = 60 / bpm;
    const loopDuration = pattern.length * secondsPerBeat;

    transport.loop = true;
    transport.loopStart = 0;
    transport.loopEnd = loopDuration;

    const layers = getLayers(pattern);

    for (const layer of layers) {
        const sound = layer.playback?.sound ?? DEFAULT_SOUND;
        const gain = layer.playback?.gain ?? 1;

        const gainNode = new Tone.Gain(gain).toDestination();
        const synth = createSynth(sound).connect(gainNode);
        const drums = createDrums();
        drums.connect(gainNode);

        addActiveNode(gainNode, synth);
        addDisposable(drums);

        for (const event of layer.events) {
            const eventTime = event.time * secondsPerBeat;
            const eventDuration = event.dur * secondsPerBeat;

            transport.schedule((time) => {
                if (event.type === "drum") {
                    playDrum(drums, event.value, time, event.velocity ?? 1);
                }

                if (event.type === "note") {
                    synth.triggerAttackRelease(
                        event.value,
                        eventDuration,
                        time,
                        event.velocity ?? 0.8
                    );
                }
            }, eventTime);
        }
    }

    transport.start();
};
