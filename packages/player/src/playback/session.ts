import * as Tone from "tone";

type RenderedSession = {
    mode: "rendered";
    player: Tone.Player;
    loopDuration: number;
    startedAt: number;
    offset: number;
    paused: boolean;
};

type LiveSession = {
    mode: "live";
};

type PlaybackSession = RenderedSession | LiveSession;

let currentSession: PlaybackSession | undefined;

const now = (): number => Tone.immediate();

const loopOffset = (session: RenderedSession): number => {
    const elapsed = now() - session.startedAt;

    return ((elapsed % session.loopDuration) + session.loopDuration) % session.loopDuration;
};

export const setLiveSession = (): void => {
    currentSession = { mode: "live" };
};

export const setRenderedSession = (
    player: Tone.Player,
    loopDuration: number
): void => {
    currentSession = {
        mode: "rendered",
        player,
        loopDuration,
        startedAt: now(),
        offset: 0,
        paused: false,
    };
};

export const clearPlaybackSession = (): void => {
    currentSession = undefined;
};

export const pauseSession = (): void => {
    if (!currentSession) {
        return;
    }

    if (currentSession.mode === "live") {
        Tone.getTransport().pause();
        return;
    }

    if (currentSession.paused) {
        return;
    }

    currentSession.offset = loopOffset(currentSession);
    currentSession.player.stop();
    currentSession.paused = true;
};

export const resumeSession = (): void => {
    if (!currentSession) {
        return;
    }

    if (currentSession.mode === "live") {
        Tone.getTransport().start();
        return;
    }

    if (!currentSession.paused) {
        return;
    }

    currentSession.player.start(undefined, currentSession.offset);
    currentSession.startedAt = now() - currentSession.offset;
    currentSession.paused = false;
};
