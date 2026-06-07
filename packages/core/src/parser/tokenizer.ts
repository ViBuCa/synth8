export type Token =
    | { type: "identifier"; value: string }
    | { type: "string"; value: string }
    | { type: "number"; value: number }
    | { type: "symbol"; value: '(' | ')' | '.' | ',' };

export const tokenize = (source: string): Token[] => {
    const tokens: Token[] = [];
    let index = 0;

    while (index < source.length) {
        const char = source[index];

        if (/\s/.test(char)) {
            index++;
            continue;
        }

        if (/[a-zA-Z_]/.test(char)) {
            let value = "";

            while (/[a-zA-Z0-9_]/.test(source[index] ?? "")) {
                value += source[index];
                index++;
            }

            tokens.push({ type: "identifier", value });
            continue;
        }

        if (char === '"') {
            index++;
            let value = "";

            while (index < source.length && source[index] !== '"') {
                value += source[index];
                index++;
            }

            if (source[index] !== '"') {
                throw new Error("Unterminated string literal.");
            }

            index++;
            tokens.push({ type: "string", value });
            continue;
        }

        if (/\d/.test(char) || (char === "-" && /\d/.test(source[index + 1] ?? ""))) {
            let value = "";

            if (char === "-") {
                value += char;
                index++;
            }

            while (/[\d.]/.test(source[index] ?? "")) {
                value += source[index];
                index++;
            }

            tokens.push({ type: "number", value: Number(value) });
            continue;
        }

        if (char === "(" || char === ")" || char === "." || char === ",") {
            tokens.push({ type: "symbol", value: char });
            index++;
            continue;
        }

        throw new Error(`Unexpected character: ${char}`);
    }

    return tokens;
};