export const repeatArray = <T>(items: T[], count: number): T[] => {
    return Array.from({ length: count }).flatMap(() => items);
};