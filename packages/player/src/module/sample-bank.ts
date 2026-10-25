export type SampleLoop =
  | { type: "none" }
  | { type: "forward"; start: number; end: number }
  | { type: "pingpong"; start: number; end: number };

/** A decoded sample asset shared by module and future instrument players. */
export type SampleAsset = {
  id: string;
  name?: string;
  buffer: AudioBuffer;
  rootNote?: number;
  finetune?: number;
  volume?: number;
  loop?: SampleLoop;
};

export type SampleSource = ArrayBuffer | ArrayBufferView | Blob;

export type PcmSampleOptions = Omit<SampleAsset, "id" | "buffer"> & {
  sampleRate?: number;
};

/**
 * Preloaded sample collection. Decoding happens when samples are added, never
 * when a note is triggered. This is the first building block for tracker
 * instruments and is also useful to applications with their own sample banks.
 */
export class SampleBank {
  private readonly assets = new Map<string, SampleAsset>();

  constructor(private readonly context: BaseAudioContext) {}

  add(asset: SampleAsset): SampleAsset {
    if (!asset.id.trim()) throw new Error("A sample id is required.");
    this.assets.set(asset.id, asset);
    return asset;
  }

  addPcm(id: string, data: Int8Array, options: PcmSampleOptions = {}): SampleAsset {
    const sampleRate = Math.max(1, Math.floor(options.sampleRate ?? 8363));
    const buffer = this.context.createBuffer(1, data.length, sampleRate);
    const channel = buffer.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) channel[index] = data[index] / 128;
    const { sampleRate: _sampleRate, ...assetOptions } = options;
    return this.add({ id, buffer, ...assetOptions });
  }

  async load(id: string, source: SampleSource, options: Omit<SampleAsset, "id" | "buffer"> = {}): Promise<SampleAsset> {
    const bytes = source instanceof Blob
      ? await source.arrayBuffer()
      : source instanceof ArrayBuffer
        ? source
        : new Uint8Array(source.buffer, source.byteOffset, source.byteLength).slice().buffer;
    const buffer = await this.context.decodeAudioData(bytes.slice(0));
    return this.add({ id, buffer, ...options });
  }

  get(id: string): SampleAsset | undefined {
    return this.assets.get(id);
  }

  has(id: string): boolean {
    return this.assets.has(id);
  }

  delete(id: string): boolean {
    return this.assets.delete(id);
  }

  clear(): void {
    this.assets.clear();
  }

  list(): readonly SampleAsset[] {
    return [...this.assets.values()];
  }
}
