export type PatternToken = {
    value: string;
    velocity?: number;
};

export const parsePatternToken = (token: string): PatternToken => {
    const [value, velocityRaw, ...rest] = token.split(":");

    if (!value || rest.length > 0) {
        throw new Error(`Invalid pattern token: ${token}`);
    }

    if (velocityRaw === undefined) {
        return { value };
    }

    const velocity = Number(velocityRaw);

    if (!Number.isFinite(velocity) || velocity < 0 || velocity > 1) {
        throw new Error(`Invalid velocity: ${velocityRaw}`);
    }

    return { value, velocity };
};