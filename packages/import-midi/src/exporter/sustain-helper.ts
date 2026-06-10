const getTokenDurationSteps = (token: string): number => {
  const match = token.match(/\/(\d+)/);

  if (!match) {
    return 1;
  }

  return Number(match[1]);
}

const getPartDurationSteps = (part: string): number => {
  return Math.max(...part.split("+").map(getTokenDurationSteps));
}

export const compressSustainRests = (parts: string[]): string[] => {
  const result: string[] = [];

  let coveredUntil = -1;

  for (let index = 0; index < parts.length; index++) {
    const part = parts[index];

    if (part === "_" && index < coveredUntil) {
      continue;
    }

    result.push(part);

    if (part !== "_") {
      coveredUntil = Math.max(
        coveredUntil,
        index + getPartDurationSteps(part)
      );
    }
  }

  return result;
}