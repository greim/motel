import UrlPattern from 'url-pattern';
import assertNever from './assert-never';
import { ElementLifecycle } from './element-lifecycle';
import { GateKeeper } from './gate-keeper';

const VACANCY_ATTRIBUTE = 'data-vacancy';

/**
 * An object of key/value pairs representing a
 * match against a vacancy.
 */
export interface PatternMatch {
  [key: string]: string;
}

/**
 * Option set used when creating a Motel instance.
 */
export interface MotelOptions {
  debug?: boolean;
}

/**
 * Callback function that handles an observed vacancy
 * when a string pattern is used.
 */
export type PatternHandler<T> = (
  match: PatternMatch,
  send: Dispatcher<T>,
  exitProm: Promise<void>,
) => void | Promise<void>;

/**
 * Callback function that handles an observed vacancy
 * when a regex pattern is used.
 */
export type RegExpHandler<T> = (
  match: RegExpMatchArray,
  send: Dispatcher<T>,
  exitProm: Promise<void>,
) => void | Promise<void>;

/**
 * Used to pass a value out of the vacancy observer
 * to whoever has subscribed to it.
 */
export type Dispatcher<T> = (data: T) => void;

type Observer<T> = PatternObserver<T> | RegExpObserver<T>;

interface PatternObserver<T> {
  is: 'pattern';
  pattern: UrlPattern;
  handler: PatternHandler<T>;
  cleanup?: () => void;
}

interface RegExpObserver<T> {
  is: 'regex';
  regex: RegExp;
  handler: RegExpHandler<T>;
  cleanup?: () => void;
}

/**
 * For all your vacancy observer needs.
 */
export class Motel<T = any> {

  /** Create a new instance with the given options. */
  public static create<T = any>(opts: MotelOptions = {}) {
    return new Motel<T>(opts);
  }

  private readonly debug: boolean;
  private readonly send: Dispatcher<T>;
  private readonly observers: Observer<T>[];
  private readonly subscriptions: Dispatcher<T>[];
  private lifecycle?: ElementLifecycle;

  private constructor(opts: MotelOptions) {
    this.debug = !!opts.debug;
    const observers: Observer<T>[] = [];
    const subscriptions: Dispatcher<T>[] = [];
    const send = createPublishFunc(subscriptions, this.debug);
    this.send = send;
    this.observers = observers;
    this.subscriptions = subscriptions;
  }

  /** Observe specific vacancy patterns. */
  public observe(matcher: string, handler: PatternHandler<T>): void
  public observe(matcher: RegExp, handler: RegExpHandler<T>): void
  public observe(matcher: string | RegExp, handler: any): void {
    const { observers } = this;
    if (typeof matcher === 'string') {
      const pattern = new UrlPattern(matcher);
      observers.push({ is: 'pattern', pattern, handler });
    } else {
      const regex = matcher;
      observers.push({ is: 'regex', regex, handler });
    }
  }

  /**
   * Setup a MutationObserver on the given element
   * and begin listening for vacancies. This should
   * be called after all observers have been created,
   * otherwise some vacancies may go unobserved.
   */
  public connect(elmt: Element): void {
    if (this.lifecycle) {
      throw new Error('already connected');
    }

    const gateKeeper = new GateKeeper();
    this.lifecycle = ElementLifecycle.of(elmt, VACANCY_ATTRIBUTE)
      .on('enter', async(el, vacancy) => {
        const exitProm = gateKeeper.incr(vacancy);
        if (exitProm) {
          // exits proceed async
          // so entrances should too
          await tick();
          this._publish(vacancy, exitProm);
        }
      })
      .on('exit', (el, attr) => {
        gateKeeper.decr(attr);
      })
      .start();
  }

  /**
   * Disconnect the MutationObserver and stop
   * listening for vacancies.
   */
  public disconnect(): void {
    if (!this.lifecycle) {
      throw new Error('not connected');
    }
    this.lifecycle.stop();
    delete this.lifecycle;
  }

  /** Subscribe to the output of your vacancy observers. */
  public subscribe(sub: Dispatcher<T>): void {
    const { subscriptions } = this;
    subscriptions.push(sub);
  }

  /** Publish a vacancy. */
  public _publish(vacancy: string, exitProm: Promise<void>): void {
    const { observers, send } = this;
    const proms = [];
    for (let observer of observers) {
      switch (observer.is) {
        case 'pattern': {
          const { pattern, handler } = observer;
          const match = processMatch(pattern.match(vacancy));
          if (match) {
            try {
              proms.push(Promise.resolve(handler(match, send, exitProm)));
            } catch(ex) {
              proms.push(Promise.reject(ex));
            }
          }
          break;
        }
        case 'regex': {
          const { regex, handler } = observer;
          const match = vacancy.match(regex);
          if (match) {
            try {
              proms.push(Promise.resolve(handler(match, send, exitProm)));
            } catch(ex) {
              proms.push(Promise.reject(ex));
            }
          }
          break;
        }
        default: {
          assertNever(observer);
        }
      }
    }
    if (proms.length === 0) {
      if (this.debug) {
        logError(`unhandled vacancy: ${JSON.stringify(vacancy)}`);
      }
    }
    const catcher = this.debug ? noisyCatcher : silentCatcher;
    Promise.all(proms).catch(catcher);
  }
}

function noisyCatcher<E extends Error>(err: E) {
  logError(err.stack);
}

// eslint-disable-next-line no-unused-vars
function silentCatcher<E extends Error>(err: E) {
}

function logError(...args: any[]): void {
  if (typeof console !== 'undefined') {
    // eslint-disable-next-line no-unused-expressions
    console?.error(...args);
  }
}

function createPublishFunc<T>(
  subscriptions: Dispatcher<T>[],
  debug: boolean,
): Dispatcher<T> {
  return (action: T) => {
    const catcher = debug ? noisyCatcher : silentCatcher;
    for (let sub of subscriptions) {
      try {
        sub(action);
      } catch(ex) {
        catcher(ex);
      }
    }
  };
}

function processMatch(match: any): PatternMatch | null {
  if (match) {
    const result: PatternMatch = {};
    for (let [key, val] of Object.entries(match)) {
      if (Array.isArray(val)) {
        val = val[0];
      }
      if (typeof val === 'string') {
        result[key] = val;
      } else {
        result[key] = `${val}`;
      }
    }
    return result;
  } else {
    return null;
  }
}

function tick(): Promise<void> {
  return new Promise(r => setImmediate(r));
}
