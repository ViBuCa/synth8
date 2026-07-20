export type SourcePosition = {
    index: number;
    line: number;
    column: number;
};

type TokenBase = {
    start: SourcePosition;
    end: SourcePosition;
};

export type Token =
    | ({ type: "identifier"; value: string } & TokenBase)
    | ({ type: "string"; value: string } & TokenBase)
    | ({ type: "number"; value: number } & TokenBase)
    | ({ type: "symbol"; value: '(' | ')' | '.' | ',' } & TokenBase);

const formatPosition = (position: SourcePosition): string => {
    return `line ${position.line}, column ${position.column}`;
};

export const formatTokenPosition = (token: Token | undefined, fallback: SourcePosition): string => {
    return formatPosition(token?.start ?? fallback);
};

export const tokenize = (source: string): Token[] => {
    const tokens: Token[] = [];
    let index = 0;
    let line = 1;
    let column = 1;

    const position = (): SourcePosition => ({ index, line, column });

    const advanceChar = (): string => {
        const char = source[index];

        index++;

        if (char === "\n") {
            line++;
            column = 1;
        } else {
            column++;
        }

        return char;
    };

    const errorAt = (message: string, at: SourcePosition = position()): never => {
        throw new Error(`${message} at ${formatPosition(at)}.`);
    };

    const pushToken = (token: Omit<Token, "start" | "end">, start: SourcePosition): void => {
        tokens.push({
            ...token,
            start,
            end: position(),
        } as Token);
    };

    while (index < source.length) {
        const char = source[index];

        if (/\s/.test(char)) {
            advanceChar();
            continue;
        }

        if (char === "/" && source[index + 1] === "/") {
            while (index < source.length && source[index] !== "\n") {
                advanceChar();
            }
            continue;
        }

        if (char === "/" && source[index + 1] === "*") {
            const start = position();
            let closed = false;

            advanceChar();
            advanceChar();

            while (index < source.length) {
                if (source[index] === "*" && source[index + 1] === "/") {
                    advanceChar();
                    advanceChar();
                    closed = true;
                    break;
                }

                advanceChar();
            }

            if (!closed) {
                errorAt("Unterminated block comment", start);
            }

            continue;
        }

        if (/[a-zA-Z_]/.test(char)) {
            const start = position();
            let value = "";

            while (/[a-zA-Z0-9_]/.test(source[index] ?? "")) {
                value += advanceChar();
            }

            pushToken({ type: "identifier", value }, start);
            continue;
        }

        if (char === '"' || char === "'") {
            const start = position();
            const quote = advanceChar();
            let value = "";

            while (index < source.length && source[index] !== quote) {
                if (source[index] === "\\") {
                    advanceChar();

                    if (index >= source.length) {
                        errorAt("Unterminated string literal", start);
                    }

                    const escaped = advanceChar();

                    switch (escaped) {
                        case "n":
                            value += "\n";
                            break;
                        case "t":
                            value += "\t";
                            break;
                        case "r":
                            value += "\r";
                            break;
                        case "\\":
                        case "\"":
                        case "'":
                            value += escaped;
                            break;
                        default:
                            value += escaped;
                            break;
                    }

                    continue;
                }

                value += advanceChar();
            }

            if (source[index] !== quote) {
                errorAt("Unterminated string literal", start);
            }

            advanceChar();
            pushToken({ type: "string", value }, start);
            continue;
        }

        if (/\d/.test(char) || (char === "-" && /\d/.test(source[index + 1] ?? ""))) {
            const start = position();
            let value = "";

            if (char === "-") {
                value += advanceChar();
            }

            while (/[\d.]/.test(source[index] ?? "")) {
                value += advanceChar();
            }

            pushToken({ type: "number", value: Number(value) }, start);
            continue;
        }

        if (char === "(" || char === ")" || char === "." || char === ",") {
            const start = position();
            const value = advanceChar();

            pushToken({ type: "symbol", value: value as Token["value"] }, start);
            continue;
        }

        errorAt(`Unexpected character: ${char}`);
    }

    return tokens;
};