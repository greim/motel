const NOOP: any = () => {};

interface TrackingState {
  count: number;
  resolvable: ExternallyResolvable;
}

/**
 * In a world where strings come in and out of existence,
 * spaced arbitrarily over time, some of which strings
 * may be duplicates, this allows us to track unique
 * entrances and exits from that group.
 */
export class GateKeeper {

  private readonly map: Map<string, TrackingState>

  constructor() {
    this.map = new Map();
  }

  /**
   * This signals the arrival of a new instance of the
   * given string. If there are already some instances
   * of this string, this will return undefined. Otherwise
   * it returns a promise which is resolved when the last
   * instance of that string leaves.
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
   * This signals the leaving of an instance of the given
   * string. If this is the last such instance to leave,
   * it will internally trigger a resolution to a promise
   * created when the first instance entered.
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

class ExternallyResolvable {
  public readonly promise: Promise<void>
  private resolver: () => void
  constructor() {
    this.resolver = NOOP;
    this.promise = new Promise(resolver => {
      this.resolver = resolver;
    });
  }
  resolve() {
    this.resolver();
  }
}
