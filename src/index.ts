import UrlPattern from 'url-pattern';
import assertNever from './assert-never';
import { ElementLifecycle } from './element-lifecycle';
import { GateKeeper } from './gate-keeper';

/** The name of the vacancy attribute. */
export const VACANCY_ATTRIBUTE = 'data-vacancy';

/**
 * A promise which resolves when all vacancies matching
 * a given pattern have disappeared from the DOM.
 */
export type ExitPromise = Promise<void>;

/**
 * An object of key/value pairs representing a
 * match against a vacancy. For example, since
 * the vacancy `"users/123"` matches the pattern
 * `"users/:id"`, the match object would look like
 * this: `{ id: '123' }`
 */
export interface PatternMatch {
  [key: string]: string;
}

/**
 * Options used when creating a Motel instance.
 */
export interface MotelOptions {
  debug?: boolean;
}

/**
 * A callback function that executes when a vacancy
 * matches a string pattern.
 *
 * @typeparam A The type of object that you will dispatch to your app.
 * @param matchObject The result of matching the vacancy with the string pattern.
 * @param dispatch Dispatches data to your app.
 * @param exit Called when all matching vacancies have left the DOM.
 */
export interface PatternCallback<A> {
  (
    matchObject: PatternMatch,
    dispatch: Dispatcher<A>,
    exit: ExitPromise,
  ): void | Promise<void>;
}

/**
 * A callback function that executes when a vacancy
 * matches a regex pattern.
 *
 * @typeparam A The type of object that you will dispatch to your app.
 * @param matchArray The result of matching the vacancy with the regex.
 * @param dispatch Dispatches data to your app.
 * @param exit Called when all matching vacancies have left the DOM.
 */
export interface RegExpCallback<A> {
  (
    matchArray: RegExpMatchArray,
    dispatch: Dispatcher<A>,
    exit: ExitPromise,
  ): void | Promise<void>;
}

/**
 * A callback function that executes when any
 * vacancy is found.
 *
 * @typeparam A The type of object that you will dispatch to your app.
 * @param vacancy The vacancy that was found.
 * @param dispatch Dispatches data to your app.
 * @param exit Called when all matching vacancies have left the DOM.
 */
export interface WildcardCallback<A> {
  (
    vacancy: string,
    dispatch: Dispatcher<A>,
    exit: ExitPromise,
  ): void | Promise<void>;
}

/**
 * Used to pass a value out of the vacancy observer
 * to whoever has subscribed to it.
 *
 * @typeparam A The type of object to be dispatched.
 */
export interface Dispatcher<A> {
  (action: A): void;
}

type Observer<T>
  = PatternObserver<T>
  | RegExpObserver<T>
  | WildcardObserver<T>;

interface PatternObserver<T> {
  is: 'pattern';
  pattern: UrlPattern;
  handler: PatternCallback<T>;
  cleanup?: () => void;
}

interface RegExpObserver<T> {
  is: 'regex';
  regex: RegExp;
  handler: RegExpCallback<T>;
  cleanup?: () => void;
}

interface WildcardObserver<T> {
  is: 'wildcard';
  handler: WildcardCallback<T>;
  cleanup?: () => void;
}

/**
 * An instance of this manages a set of vacancy observers.
 * Typically it would be created at application startup
 * time and would last for the duration of the app.
 * Internally, it creates a `MutationObserver` which does
 * the actual work of listening for vacancies.
 *
 * @typeparam A The output type of your vacancy observers.
 *   That is, the type of object you dispatch from your
 *   vacancy handlers. For example, in a Redux app this
 *   would probably be your Redux action type.
 */
export default class Motel<A = any> {

  /**
   * Create a new instance with the given options.
   *
   * @typeparam A The type of object that you will dispatch to
   *   your app from your vacancy observers.
   */
  public static create<A = any>(opts: MotelOptions = {}) {
    return new Motel<A>(opts);
  }

  private readonly debug: boolean;
  private readonly send: Dispatcher<A>;
  private readonly observers: Observer<A>[];
  private readonly subscriptions: Dispatcher<A>[];
  private lifecycle?: ElementLifecycle;

  private constructor(opts: MotelOptions) {
    this.debug = !!opts.debug;
    const observers: Observer<A>[] = [];
    const subscriptions: Dispatcher<A>[] = [];
    const send = createPublishFunc(subscriptions, this.debug);
    this.send = send;
    this.observers = observers;
    this.subscriptions = subscriptions;
  }

  /**
   * Create a wildcard observer that sees every vacancy.
   *
   * @param wildcard The special `"*"` string, which represents
   *   a pattern that matches everything.
   */
  public observe(wildcard: '*', handler: WildcardCallback<A>): Motel<A>
  /**
   * Create an observer that matches vacancies based on the
   * given string pattern. Pattern matching follows the rules of
   * a [UrlPattern](https://www.npmjs.com/package/url-pattern)
   * object.
   *
   * @param stringPattern A pattern string as described
   *   [here](https://www.npmjs.com/package/url-pattern).
   */
  public observe(stringPattern: string, handler: PatternCallback<A>): Motel<A>
  /**
   * Create an observer that matches vacancies based on a regex.
   *
   * @param regex A pattern string as described
   *   [here](https://www.npmjs.com/package/url-pattern).
   */
  public observe(regex: RegExp, handler: RegExpCallback<A>): Motel<A>
  /**
   * @param handler A callback function that runs whenever
   *   a vacancy is found.
   */
  public observe(matcher: string | RegExp, handler: any): Motel<A> {
    const { observers } = this;
    if (matcher === '*') {
      observers.push({ is: 'wildcard', handler });
    } else if (typeof matcher === 'string') {
      const pattern = new UrlPattern(matcher);
      observers.push({ is: 'pattern', pattern, handler });
    } else {
      const regex = matcher;
      observers.push({ is: 'regex', regex, handler });
    }
    return this;
  }

  /**
   * Begin listening on the given element for vacancies.
   * This should only be called after all observers have
   * been created, otherwise some vacancies may be ignored.
   *
   * @param element Vacancies occurring on or anywhere below
   *   this element will be observed.
   */
  public connect(element: Element): Motel<A> {
    if (this.lifecycle) {
      throw new Error('already connected');
    }

    const gateKeeper = new GateKeeper();
    this.lifecycle = ElementLifecycle.of(element, VACANCY_ATTRIBUTE)
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
    return this;
  }

  /**
   * Stop listening for vacancies.
   */
  public disconnect(): Motel<A> {
    if (!this.lifecycle) {
      throw new Error('not connected');
    }
    this.lifecycle.stop();
    delete this.lifecycle;
    return this;
  }

  /**
   * Subscribe to the output of your vacancy observers.
   * Actions from all of your observers will be seen by
   * the subscriber.
   *
   * @param subscriber A callback function which receives
   *   objects of type `A` dispatched from your vacancy
   *   observers.
   */
  public subscribe(subscriber: Dispatcher<A>): Motel<A> {
    const { subscriptions } = this;
    subscriptions.push(subscriber);
    return this;
  }

  /** @hidden */
  _publish(vacancy: string, exitProm: Promise<void>): void {
    const { observers, send } = this;
    const proms: Array<Promise<void> | void> = [];
    for (let observer of observers) {
      switch (observer.is) {
        case 'wildcard': {
          const { handler } = observer;
          try { proms.push(handler(vacancy, send, exitProm)); }
          catch(ex) { proms.push(Promise.reject(ex)); }
          break;
        }
        case 'pattern': {
          const { pattern, handler } = observer;
          const match = processMatch(pattern.match(vacancy));
          if (match) {
            try { proms.push(handler(match, send, exitProm)); }
            catch(ex) { proms.push(Promise.reject(ex)); }
          }
          break;
        }
        case 'regex': {
          const { regex, handler } = observer;
          const match = vacancy.match(regex);
          if (match) {
            try { proms.push(handler(match, send, exitProm)); }
            catch(ex) { proms.push(Promise.reject(ex)); }
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
