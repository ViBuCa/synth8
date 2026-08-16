/** Serialize operations that use Tone.Offline and shared Tone state. */
let pending: Promise<void> = Promise.resolve();

export const runRender = async <T>(operation: () => Promise<T> | T): Promise<T> => {
    const previous = pending;
    let release!: () => void;
    pending = new Promise<void>((resolve) => {
        release = resolve;
    });

    await previous;
    try {
        return await operation();
    } finally {
        release();
    }
};
