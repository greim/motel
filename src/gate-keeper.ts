const NOOP: any = () => {};

interface TrackingState {
  count: number;
  resolvable: ExternallyResolvable;
}

/**
 * Tracks appearances and disappearances of strings within a set.
 */
export class GateKeeper {
  private readonly map: Map<string, TrackingState>;

  constructor() {
    this.map = new Map();
  }

  /**
   * Add an instance of the given string. If there are already some
   * instances of this string, this returns undefined. Otherwise it
   * returns a promise which is resolved when the last instance of
   * that string leaves.
   */
  incr(str: string): Promise<void> | undefined {
    const state = this.map.get(str);
    if (state !== undefined) {
      this.map.set(str, { ...state, count: state.count + 1 });
      return undefined;
    } else {
      const newState: TrackingState = {
        count: 1,
        resolvable: new ExternallyResolvable(),
      };
      this.map.set(str, newState);
      return newState.resolvable.promise;
    }
  }

  /**
   * Remove an instance of the given string. If this is the last one
   * to leave, it will internally trigger a resolution to the promise
   * created when the first instance arriveds.
   */
  decr(str: string): void {
    const state = this.map.get(str);
    if (state !== undefined) {
      const newCount = state.count - 1;
      if (newCount < 1) {
        this.map.delete(str);
        state.resolvable.resolve();
      } else {
        this.map.set(str, { ...state, count: newCount });
      }
    }
  }
}

/**
 * This is a wrapper on a Promise object that can be resolved from
 * the outside.
 */
class ExternallyResolvable {
  public readonly promise: Promise<void>;
  private resolver: () => void;
  constructor() {
    this.resolver = NOOP;
    this.promise = new Promise((resolver) => {
      this.resolver = resolver;
    });
  }
  resolve() {
    this.resolver();
  }
}
