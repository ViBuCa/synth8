import type { AstNode } from "../model/ast";
import { parseBeatPattern } from "./beat-pattern-parser";
import { tokenize, type Token } from "./tokenizer";

class Parser {
    private index = 0;

    constructor(private readonly tokens: Token[]) { }

    parse(): AstNode {
        const node = this.parseBeatExpression();

        if (!this.isAtEnd()) {
            throw new Error("Unexpected tokens after expression.");
        }

        return node;
    }

    private parseBeatExpression(): AstNode {
        this.expectIdentifier("beat");
        this.expectSymbol("(");

        const body = this.expectString();

        this.expectSymbol(")");

        let rate = 1;

        if (this.matchSymbol(".")) {
            this.expectIdentifier("rate");
            this.expectSymbol("(");
            rate = this.expectNumber();
            this.expectSymbol(")");
        }

        if (!Number.isFinite(rate) || rate <= 0) {
            throw new Error(`Invalid rate: ${rate}`);
        }

        return {
            kind: "BeatExpression",
            steps: parseBeatPattern(body),
            rate,
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

    private expectSymbol(value: "(" | ")" | "."): void {
        const token = this.advance();

        if (token?.type !== "symbol" || token.value !== value) {
            throw new Error(`Expected "${value}".`);
        }
    }

    private matchSymbol(value: "(" | ")" | "."): boolean {
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