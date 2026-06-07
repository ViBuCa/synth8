import type { AstNode } from "../model/ast";
import { parseBeatPattern } from "./beat-pattern-parser";
import { parseMelodyPattern } from "./melody-pattern-parser";
import { tokenize, type Token } from "./tokenizer";

class Parser {
    private index = 0;

    constructor(private readonly tokens: Token[]) { }

    parse(): AstNode {
        const node = this.parseExpression();

        if (!this.isAtEnd()) {
            throw new Error("Unexpected tokens after expression.");
        }

        return node;
    }

    private parseExpression(): AstNode {
        const token = this.peek();

        if (token?.type !== "identifier") {
            throw new Error("Expected expression.");
        }

        if (token.value === "beat") {
            return this.parseBeatExpression();
        }

        if (token.value === "melody") {
            return this.parseMelodyExpression();
        }

        if (token.value === "song") {
            return this.parseSongExpression();
        }

        throw new Error(`Unknown expression: ${token.value}`);
    }

    private expectAnyIdentifier(): string {
        const token = this.advance();

        if (token?.type !== "identifier") {
            throw new Error("Expected identifier.");
        }

        return token.value;
    }

    private checkSaneRange (value: number, name: string): void {
        if (!Number.isFinite(value) || value <= 0 || value > 100) {
            throw new Error(`Invalid ${name}: ${value}`);
        }
    }

    private parseOptionalRate(): 
    { 
        rate: number; 
        transpose: number; 
        repeat: number;
        loop: boolean;
    } {
        let rate = 1;
        let transpose = 0;
        let repeat = 1;
        let loop = false;

        while (this.matchSymbol(".")) {
            const modifier = this.expectAnyIdentifier();

            let value = 0;
            this.expectSymbol("(");
            switch (modifier) {
                case 'rate':
                case 'fast':
                case 'slow':
                case 'transpose':
                case 'repeat':
                    value = this.expectNumber();
                    break;
            }

            this.expectSymbol(")");
            switch (modifier) {
                case 'rate':                     
                    this.checkSaneRange(value, "rate");
                    rate = value;
                    break;
                case 'fast':
                    this.checkSaneRange(value, "fast");
                    rate *= value;
                    break;
                case 'slow':
                    this.checkSaneRange(value, "slow");
                    rate /= value;
                    break;
                case 'transpose':
                    if (!Number.isInteger(value)) {
                        throw new Error(`Transpose value must be an integer: ${value}`);
                    }
                    transpose += value;
                    break;
                case 'repeat':
                    if (!Number.isInteger(value) || value <= 0) {
                        throw new Error(`Repeat value must be an integer: ${value}`);
                    }
                    repeat = value;
                    break;
                case 'loop':
                    loop = true;
                    break;
                default:
                    throw new Error(`Unknown modifier: ${modifier}`);
            }
        }
        return { rate, transpose, repeat, loop };
    }

    private parseBeatExpression(): AstNode {
        this.expectIdentifier("beat");
        this.expectSymbol("(");

        const body = this.expectString();

        this.expectSymbol(")");

        const { rate, repeat, loop } = this.parseOptionalRate();

        return {
            kind: "BeatExpression",
            steps: parseBeatPattern(body),
            rate,
            repeat,
            loop
        };
    }

    private parseMelodyExpression(): AstNode {
        this.expectIdentifier("melody");
        this.expectSymbol("(");

        const body = this.expectString();

        this.expectSymbol(")");

        const { rate, transpose, repeat, loop } = this.parseOptionalRate();

        return {
            kind: "MelodyExpression",
            notes: parseMelodyPattern(body),
            rate,
            transpose,
            repeat,
            loop
        };
    }

    private parseSongExpression(): AstNode {
        this.expectIdentifier("song");
        this.expectSymbol("(");

        const tracks: AstNode[] = [];

        if (!this.matchSymbol(")")) {
            do {
                tracks.push(this.parseExpression());
            } while (this.matchSymbol(","));

            this.expectSymbol(")");
        }

        if (tracks.length === 0) {
            throw new Error("song() requires at least one track.");
        }

        return {
            kind: "SongExpression",
            tracks,
        };
    }

    private expectIdentifier(value: string): void {
        const token = this.advance();

        if (token?.type !== "identifier" || token.value !== value) {
            throw new Error(`Expected identifier "${value}".`);
        }
    }

    private expectString(): string {
        const token = this.advance();

        if (token?.type !== "string") {
            throw new Error("Expected string.");
        }

        return token.value;
    }

    private expectNumber(): number {
        const token = this.advance();

        if (token?.type !== "number") {
            throw new Error("Expected number.");
        }

        return token.value;
    }

    private expectSymbol(value: "(" | ")" | "." | ","): void {
        const token = this.advance();

        if (token?.type !== "symbol" || token.value !== value) {
            throw new Error(`Expected "${value}".`);
        }
    }

    private matchSymbol(value: "(" | ")" | "." | ","): boolean {
        const token = this.peek();

        if (token?.type === "symbol" && token.value === value) {
            this.advance();
            return true;
        }

        return false;
    }

    private advance(): Token | undefined {
        return this.tokens[this.index++];
    }

    private peek(): Token | undefined {
        return this.tokens[this.index];
    }

    private isAtEnd(): boolean {
        return this.index >= this.tokens.length;
    }
}

export const parse = (source: string): AstNode => {
    return new Parser(tokenize(source)).parse();
};