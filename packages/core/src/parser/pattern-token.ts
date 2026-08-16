import type { Articulation } from "../model/ast";

export type PatternToken = {
    value: string;
    velocity?: number;
    duration: number;
    articulation?: Articulation;
    bend?: number;
};

export const parsePatternToken = (token: string): PatternToken => {
    const [valueAndVelocity, durationRaw, ...durationRest] = token.split("/");

    if (!valueAndVelocity || durationRest.length > 0) {
        throw new Error(`Invalid pattern token: ${token}`);
    }

    const articulationMatch = valueAndVelocity.match(/^(.*?)\{([^{}]+)\}$/);
    const valueAndArticulation = articulationMatch?.[1] ?? valueAndVelocity;
    const articulationRaw = articulationMatch?.[2];
    const [value, velocityRaw, ...velocityRest] = valueAndArticulation.split(":");

    if (!value || velocityRest.length > 0) {
        throw new Error(`Invalid pattern token: ${token}`);
    }

    const duration = durationRaw === undefined ? 1 : Number(durationRaw);

    if (!Number.isFinite(duration) || duration <= 0) {
        throw new Error(`Invalid duration: ${durationRaw}`);
    }

    let articulation: Articulation | undefined;
    let bend: number | undefined;

    if (articulationRaw?.startsWith("bend:")) {
        bend = Number(articulationRaw.slice(5));
        if (!Number.isFinite(bend) || bend < -24 || bend > 24) {
            throw new Error(`Bend must be between -24 and 24 semitones: ${articulationRaw}`);
        }
    } else if (articulationRaw) {
        const allowed: Articulation[] = ["accent", "staccato", "legato", "slide", "vibrato", "mute"];
        if (!allowed.includes(articulationRaw as Articulation)) {
            throw new Error(`Unknown articulation: ${articulationRaw}`);
        }
        articulation = articulationRaw as Articulation;
    }

    if (velocityRaw === undefined) {
        return { value, duration, ...(articulation ? { articulation } : {}), ...(bend !== undefined ? { bend } : {}) };
    }

    const velocity = Number(velocityRaw);

    if (!Number.isFinite(velocity) || velocity < 0 || velocity > 1) {
        throw new Error(`Invalid velocity: ${velocityRaw}`);
    }

    return { value, velocity, duration, ...(articulation ? { articulation } : {}), ...(bend !== undefined ? { bend } : {}) };
};