import { DrumKit } from "../model/drum";


export const playDrum = (drums: DrumKit, value: string, time: number, velocity = 1) => {
    switch (value) {
        case "kick":
            drums.kick.triggerAttackRelease("C1", "8n", time, velocity);
            break;

        case "snare":
            drums.snare.triggerAttackRelease("16n", time, velocity);
            break;

        case "clap":
            drums.clap.triggerAttackRelease("16n", time, velocity);
            break;

        case "hihat":
            drums.hihat.triggerAttackRelease("16n", time, velocity);
            break;

        case "openhat":
            drums.openhat.triggerAttackRelease("8n", time, velocity);
            break;

        case "tom":
        case "midtom":
            drums.midtom.triggerAttackRelease("G1", "8n", time, velocity);
            break;

        case "lowtom":
            drums.lowtom.triggerAttackRelease("C1", "8n", time, velocity);
            break;

        case "hitom":
            drums.hitom.triggerAttackRelease("C2", "8n", time, velocity);
            break;

        case "rim":
            drums.rim.triggerAttackRelease("C5", "32n", time, velocity);
            break;

        case "cowbell":
            drums.cowbell.triggerAttackRelease("16n", time, velocity);
            break;

        case "crash":
            drums.crash.triggerAttackRelease("2n", time, velocity);
            break;

        case "ride":
            drums.ride.triggerAttackRelease("16n", time, velocity);
            break;

        case "tambourine":
            drums.tambourine.triggerAttackRelease("16n", time, velocity);
            break;

        case "shaker":
            drums.shaker.triggerAttackRelease("32n", time, velocity);
            break;

        default:
            console.warn(`Unknown drum sound: ${value}`);
    }
};