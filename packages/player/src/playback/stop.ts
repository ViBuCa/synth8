import * as Tone from "tone";
import { disposeActiveNodes } from "./lifecycle";
import { stopSession } from "./session";


export const stop = (): void => {
    const transport = Tone.getTransport();

    transport.stop();
    transport.cancel();
    transport.loop = false;

    stopSession();
    disposeActiveNodes();
};
