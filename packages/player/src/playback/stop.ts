import * as Tone from "tone";
import { disposeActiveNodes } from "./lifecycle";
import { clearPlaybackSession } from "./session";


export const stop = (): void => {
    const transport = Tone.getTransport();

    transport.stop();
    transport.cancel();
    transport.loop = false;

    disposeActiveNodes();
    clearPlaybackSession();
};
