export type PatternToken = {
    value: string;
    velocity?: number;
    duration: number;
};

export const parsePatternToken = (token: string): PatternToken => {
    const [valueAndVelocity, durationRaw, ...durationRest] = token.split("/");

    if (!valueAndVelocity || durationRest.length > 0) {
        throw new Error(`Invalid pattern token: ${token}`);
    }

    const [value, velocityRaw, ...velocityRest] = valueAndVelocity.split(":");

    if (!value || velocityRest.length > 0) {
        throw new Error(`Invalid pattern token: ${token}`);
    }

    const duration = durationRaw === undefined ? 1 : Number(durationRaw);

    if (!Number.isFinite(duration) || duration <= 0) {
        throw new Error(`Invalid duration: ${durationRaw}`);
    }

    if (velocityRaw === undefined) {
        return { value, duration };
    }

    const velocity = Number(velocityRaw);

    if (!Number.isFinite(velocity) || velocity < 0 || velocity > 1) {
        throw new Error(`Invalid velocity: ${velocityRaw}`);
    }

    return { value, velocity, duration };
};