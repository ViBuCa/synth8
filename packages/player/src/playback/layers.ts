import { Pattern, PatternLayer } from "@vibuca/synth8-core";

export const getLayers = (pattern: Pattern): PatternLayer[] => {
    if (pattern.layers?.length > 0) {
        return pattern.layers;
    }

    return [{ events: pattern.events }];
};
