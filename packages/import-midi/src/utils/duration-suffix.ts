export const durationSuffix = (dur: number, step: number): string => {
    const steps = Math.max(1, Math.round(dur / step));

    if (steps === 1) {
        return "";
    }

    return `/${steps}`;
}