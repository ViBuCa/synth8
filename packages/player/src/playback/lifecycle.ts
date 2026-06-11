import * as Tone from 'tone';

let activeNodes: Tone.ToneAudioNode[] = [];
let activeDisposables: { dispose: () => void }[] = []

export const addActiveNode = (...elements: Tone.ToneAudioNode[]) => {
    activeNodes.push(...elements);
}

export const addDisposable = (disposable: { dispose: () => void } ) => {
        activeDisposables.push(disposable);
}

export const disposeActiveNodes = (): void => {
    for (const node of activeNodes) {
        node.dispose();
    }

    for (const disposable of activeDisposables) {
        disposable.dispose();
    }

    activeNodes = [];
    activeDisposables = [];
};
