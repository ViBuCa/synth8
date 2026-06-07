import { describe, expect, it } from "vitest";
import { parsePatternToken } from "../../parser/pattern-token";

describe('compile pattern-token', () => {
    it("parses token duration", () => {
        expect(parsePatternToken("kick/2")).toEqual({
            value: "kick",
            duration: 2,
        });
    });

    it("parses token velocity and duration", () => {
        expect(parsePatternToken("kick:0.75/2")).toEqual({
            value: "kick",
            velocity: 0.75,
            duration: 2,
        });
    });

    it("uses duration 1 by default", () => {
        expect(parsePatternToken("kick")).toEqual({
            value: "kick",
            duration: 1,
        });
    });

    it("rejects invalid duration", () => {
        expect(() => parsePatternToken("kick/0")).toThrow("Invalid duration: 0");
    });

    it("rejects invalid duration syntax", () => {
        expect(() => parsePatternToken("kick/2/3")).toThrow(
            "Invalid pattern token: kick/2/3"
        );
    });
})