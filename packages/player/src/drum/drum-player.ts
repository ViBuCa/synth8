import { DrumKit } from "../model/drum";

const triggerDrum = (
    instrument: DrumKit[keyof Omit<DrumKit, "connect" | "dispose">],
    ...args: Parameters<NonNullable<typeof instrument>["triggerAttackRelease"]>
) => {
    instrument?.triggerAttackRelease(...args);
};

export const playDrum = (drums: DrumKit, value: string, time: number, velocity = 1) => {
    switch (value) {
        case "kick":
            triggerDrum(drums.kick, "C1", "8n", time, velocity);
            break;

        case "snare":
            triggerDrum(drums.snare, "16n", time, velocity);
            break;

        case "clap":
            triggerDrum(drums.clap, "16n", time, velocity);
            break;

        case "hihat":
            triggerDrum(drums.hihat, "16n", time, velocity);
            break;

        case "openhat":
            triggerDrum(drums.openhat, "8n", time, velocity);
            break;

        case "tom":
        case "midtom":
            triggerDrum(drums.midtom, "G1", "8n", time, velocity);
            break;

        case "lowtom":
            triggerDrum(drums.lowtom, "C1", "8n", time, velocity);
            break;

        case "hitom":
            triggerDrum(drums.hitom, "C2", "8n", time, velocity);
            break;

        case "rim":
            triggerDrum(drums.rim, "C5", "32n", time, velocity);
            break;

        case "cowbell":
            triggerDrum(drums.cowbell, "16n", time, velocity);
            break;

        case "crash":
            triggerDrum(drums.crash, "2n", time, velocity);
            break;

        case "ride":
            triggerDrum(drums.ride, "16n", time, velocity);
            break;

        case "tambourine":
            triggerDrum(drums.tambourine, "16n", time, velocity);
            break;

        case "shaker":
            triggerDrum(drums.shaker, "32n", time, velocity);
            break;

        default:
            console.warn(`Unknown drum sound: ${value}`);
    }
};
