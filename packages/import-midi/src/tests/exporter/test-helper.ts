export const normalizeSource = (source: string): string => {
  return source
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}