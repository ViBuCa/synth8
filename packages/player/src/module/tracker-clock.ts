export type TrackerPosition = {
  order: number;
  pattern: number;
  row: number;
  tick: number;
};

export type TrackerClockOptions = {
  orders: readonly number[];
  patternRows: ReadonlyMap<number, number> | Record<number, number>;
  speed?: number;
  tempo?: number;
  restartOrder?: number;
};

export type TrackerTick = TrackerPosition & {
  seconds: number;
};

const rowCount = (rows: TrackerClockOptions["patternRows"], pattern: number): number => {
  const value = rows instanceof Map
    ? rows.get(pattern)
    : (rows as Record<number, number>)[pattern];
  return Math.max(1, Math.floor(value ?? 1));
};

/**
 * Tick/row/order clock shared by tracker format adapters. The default timing
 * follows the traditional tracker convention: one tick is 2.5 / BPM seconds.
 */
export class TrackerClock {
  readonly orders: readonly number[];
  readonly patternRows: TrackerClockOptions["patternRows"];
  readonly restartOrder: number;
  private position: TrackerPosition;
  private speedValue: number;
  private tempoValue: number;

  constructor(options: TrackerClockOptions) {
    this.orders = options.orders;
    this.patternRows = options.patternRows;
    this.restartOrder = Math.max(0, Math.floor(options.restartOrder ?? 0));
    this.speedValue = Math.max(1, Math.floor(options.speed ?? 6));
    this.tempoValue = Math.max(1, options.tempo ?? 125);
    this.position = {
      order: 0,
      pattern: this.orders[0] ?? 0,
      row: 0,
      tick: 0,
    };
  }

  get speed(): number { return this.speedValue; }
  get tempo(): number { return this.tempoValue; }
  get tickDuration(): number { return 2.5 / this.tempoValue; }
  get current(): TrackerPosition { return { ...this.position }; }

  reset(): void {
    this.position = {
      order: 0,
      pattern: this.orders[0] ?? 0,
      row: 0,
      tick: 0,
    };
  }

  setSpeed(speed: number): void {
    this.speedValue = Math.max(1, Math.floor(speed));
    this.position.tick = Math.min(this.position.tick, this.speedValue - 1);
  }

  setTempo(tempo: number): void {
    this.tempoValue = Math.max(1, tempo);
  }

  jump(order: number, row = 0): void {
    const nextOrder = Math.max(0, Math.min(this.orders.length - 1, Math.floor(order)));
    this.position.order = nextOrder;
    this.position.pattern = this.orders[nextOrder] ?? 0;
    this.position.row = Math.max(0, Math.min(rowCount(this.patternRows, this.position.pattern) - 1, Math.floor(row)));
    this.position.tick = 0;
  }

  /** Advance one tracker tick and return the new position. */
  advance(): TrackerTick {
    this.position.tick += 1;
    if (this.position.tick >= this.speedValue) {
      this.position.tick = 0;
      this.position.row += 1;
      const rows = rowCount(this.patternRows, this.position.pattern);
      if (this.position.row >= rows) {
        this.position.row = 0;
        this.position.order += 1;
        if (this.position.order >= this.orders.length) this.position.order = this.restartOrder;
        this.position.pattern = this.orders[this.position.order] ?? 0;
      }
    }
    return { ...this.position, seconds: this.tickDuration };
  }
}
