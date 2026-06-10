import * as Tone from "tone";


export const stop = (): void => {
    const transport = Tone.getTransport();

    transport.stop();
    transport.cancel();
    transport.loop = false;

    disposeActiveNodes();
};