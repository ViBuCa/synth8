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

    private parseOptionalRate(): { rate: number } {
        let rate = 1;

        while (this.matchSymbol(".")) {
            const modifier = this.expectAnyIdentifier();

            this.expectSymbol("(");
            const value = this.expectNumber();
            this.expectSymbol(")");
            switch (modifier) {
                case 'rate':
                    rate *= value;
                    break;
                case 'fast':
                    rate *= value;
                    break;
                case 'slow':
                    rate /= value;
                    break;
                default:
                    throw new Error(`Unknown modifier: ${modifier}`);
            }
        }

        if (!Number.isFinite(rate) || rate <= 0) {
            throw new Error(`Invalid rate: ${rate}`);
        }

        return { rate };
    }

    private parseBeatExpression(): AstNode {
        this.expectIdentifier("beat");
        this.expectSymbol("(");

        const body = this.expectString();

        this.expectSymbol(")");

        const { rate } = this.parseOptionalRate();

        return {
            kind: "BeatExpression",
            steps: parseBeatPattern(body),
            rate,
        };
    }

    private parseMelodyExpression(): AstNode {
        this.expectIdentifier("melody");
        this.expectSymbol("(");

        const body = this.expectString();

        this.expectSymbol(")");

        const { rate } = this.parseOptionalRate();

        return {
            kind: "MelodyExpression",
            notes: parseMelodyPattern(body),
            rate,
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