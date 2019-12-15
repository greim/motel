import UrlPattern from 'url-pattern';
import assertNever from './assert-never';
import { ElementLifecycle } from './element-lifecycle';
import { GateKeeper } from './gate-keeper';
import Telemetry, { TelemetryLevel, TelemetryHandler, consoleTelemetryHandler } from './telemetry';

/** The name of the vacancy attribute. */
export const VACANCY_ATTRIBUTE = 'data-vacancy';

const DEFAULT_OPTIONS = {
  telemetryLevel: 'warn',
  telemetryHandler: consoleTelemetryHandler,
} as const;

/**
 * A promise that resolves when all vacancies matching
 * a given pattern have disappeared from the DOM.
 */
export type ExitPromise = Promise<void>;

/**
 * Key/value pairs representing a match against a vacancy.
 * For example, the vacancy `"users/123"` matches the pattern `"users/:id"`.
 * The corresponding match object would look like this: `{ id: '123' }`.
 */
export interface PatternMatch {
  [key: string]: string;
}

/**
 * Options used when creating a Motel instance.
 */
export interface MotelOptions {
  /**
   * Higher levels generate less telemetry.
   * For example, use `"warn"` in prod, `"debug"` in dev.
   * The default is `"warn"`.
   */
  telemetryLevel?: TelemetryLevel;
  /**
   * Supplying this overrides the default behavior of logging to console.
   */
  telemetryHandler?: TelemetryHandler;
}

/**
 * Callback that executes when a vacancy matches a string pattern.
 *
 * @typeparam A The type of object that you'll dispatch to your app.
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
 * Callback that executes when a vacancy matches a regex pattern.
 *
 * @typeparam A The type of object that you'll dispatch to your app.
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
 * Callback that executes when any vacancy is found.
 *
 * @typeparam A The type of object that you'll dispatch to your app.
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
 * Used to dispatch an object of type `<A>` to any subscribers.
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
 * This is your main API entry point to this library.
 *
 * An instance of this class manages your vacancy observers,
 * including methods for adding observers and listening on a
 * DOM element. Typically the instance would be created at
 * application startup time and would last for the duration
 * of the app.
 *
 * Internally, it creates a `MutationObserver` which does
 * the actual work of detecting vacancies.
 *
 * For convenience, methods on this class are chainable,
 * allowing patterns like this:
 *
 * ```js
 * const vacancies = Motel.create()
 *   .observe(...observer callback...)
 *   .observe(...observer callback...)
 *   .observe(...observer callback...)
 *   .subscribe(action => store.dipatch(action))
 *   .connect(document.querySelector('#root'));
 * ```
 *
 * ...however note that it may be better to break these
 * calls across different modules.
 *
 * @typeparam A The output type of this Motel instance.
 *   That is, the type of object you'll dispatch from your
 *   observer callbacks. For example, in a Redux app this
 *   would probably be your Redux action type.
 */
export default class Motel<A = any> {

  /**
   * Create a new instance with the given options.
   *
   * @typeparam A The type of object that you'll dispatch to
   *   your app from your vacancy observers.
   */
  public static create<A = any>(opts: MotelOptions = DEFAULT_OPTIONS) {
    return new Motel<A>(opts);
  }

  private readonly telemetry: Telemetry;
  private readonly send: Dispatcher<A>;
  private readonly observers: Observer<A>[];
  private readonly subscriptions: Dispatcher<A>[];
  private lifecycle?: ElementLifecycle;

  private constructor(opts: MotelOptions) {
    const allOpts = { ...DEFAULT_OPTIONS, ...opts };
    this.telemetry = new Telemetry(
      allOpts.telemetryLevel,
      allOpts.telemetryHandler,
    );
    const observers: Observer<A>[] = [];
    const subscriptions: Dispatcher<A>[] = [];
    const send = createPublishFunc(subscriptions, this.telemetry);
    this.send = send;
    this.observers = observers;
    this.subscriptions = subscriptions;
    this.telemetry.send('debug', 'instance created');
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
      this.telemetry.send('debug', 'adding wildcard observer');
      observers.push({ is: 'wildcard', handler });
    } else if (typeof matcher === 'string') {
      const pattern = new UrlPattern(matcher);
      this.telemetry.send('debug', `adding string pattern observer: ${matcher}`);
      observers.push({ is: 'pattern', pattern, handler });
    } else {
      const regex = matcher;
      this.telemetry.send('debug', `adding regex observer: ${regex}`);
      observers.push({ is: 'regex', regex, handler });
    }
    return this;
  }

  /**
   * Connect a `MutationObserver` to the given root DOM element and begin watchng for vacancies.
   * It also synchronously finds pre-existing vacancies in the root's subtree and reports them to observers.
   * Observers should thus be attached before calling this method, or some vacancies may go undetected.
   * This is especially relevant if you're using SSR.
   *
   * @param root Vacancies occurring on or anywhere below
   *   this element will be observed.
   */
  public connect(root: Element): Motel<A> {
    if (this.lifecycle) {
      this.telemetry.send('error', 'instance is already connected');
      return this;
    }

    const id = root.id ? `#${root.id}` : '';
    const className = root.className ? `.${root.className}` : '';
    const nodeDescriptor = `${root.nodeName.toLowerCase()}${id}${className}`;
    this.telemetry.send('debug', `connecting instance to DOM node: ${nodeDescriptor}`);
    const gateKeeper = new GateKeeper();
    this.lifecycle = ElementLifecycle.of(root, VACANCY_ATTRIBUTE)
      .on('enter', async(el, vacancy) => {
        this.telemetry.send('silly', `incrementing vacancy: ${vacancy}`);
        const exitProm = gateKeeper.incr(vacancy);
        if (exitProm) {
          // exits proceed async
          // so entrances should too
          await tick();
          this._publish(vacancy, exitProm);
        }
      })
      .on('exit', (el, vacancy) => {
        this.telemetry.send('silly', `decrementing vacancy: ${vacancy}`);
        gateKeeper.decr(vacancy);
      })
      .start();
    return this;
  }

  /**
   * Stop listening for vacancies.
   */
  public disconnect(): Motel<A> {
    if (!this.lifecycle) {
      this.telemetry.send('error', 'instance is not connected');
      return this;
    }
    this.telemetry.send('debug', 'disconnecting instance');
    this.lifecycle.stop();
    delete this.lifecycle;
    return this;
  }

  /**
   * Subscribe to the output of this instance. That is, a stream
   * of objects of type `<A>`. Every dispatched object will be
   * seen by the subscriber.
   *
   * @param subscriber A callback function which receives
   *   objects of type `A` dispatched from your vacancy
   *   observers.
   */
  public subscribe(subscriber: Dispatcher<A>): Motel<A> {
    this.telemetry.send('debug', 'adding subscriber');
    const { subscriptions } = this;
    subscriptions.push(subscriber);
    return this;
  }

  /** @hidden */
  _publish(vacancy: string, exitProm: Promise<void>): void {
    this.telemetry.send('debug', `entering vacancy: ${vacancy}`);
    exitProm.then(() =>
      this.telemetry.send('debug', `exiting vacancy: ${vacancy}`));
    const { observers, send } = this;
    const proms: Array<Promise<void> | void> = [];
    for (let observer of observers) {
      switch (observer.is) {
        case 'wildcard': {
          const { handler } = observer;
          this.telemetry.send('debug', `handling wildcard vacancy: ${vacancy}`);
          try { proms.push(handler(vacancy, send, exitProm)); }
          catch(ex) { proms.push(Promise.reject(ex)); }
          break;
        }
        case 'pattern': {
          const { pattern, handler } = observer;
          const match = processMatch(pattern.match(vacancy));
          if (match) {
            this.telemetry.send('debug', `handling string pattern vacancy: ${vacancy}`, match);
            try { proms.push(handler(match, send, exitProm)); }
            catch(ex) { proms.push(Promise.reject(ex)); }
          }
          break;
        }
        case 'regex': {
          const { regex, handler } = observer;
          const match = vacancy.match(regex);
          if (match) {
            this.telemetry.send('debug', `handling regex vacancy: ${vacancy}`, match);
            try { proms.push(handler(match, send, exitProm)); }
            catch(ex) { proms.push(Promise.reject(ex)); }
          }
          break;
        }
        default: {
          this.telemetry.send('critical', 'untyped observer', observer);
          assertNever(observer);
        }
      }
    }
    if (proms.length === 0) {
      this.telemetry.send('warn', `unobserved vacancy: ${vacancy}`);
    }
    Promise.all(proms).catch(err =>
      this.telemetry.send('error', `error while handling vacancy: ${vacancy}`, err));
  }
}

function createPublishFunc<T>(
  subscriptions: Dispatcher<T>[],
  telemetry: Telemetry,
): Dispatcher<T> {
  return (action: T) => {
    for (let sub of subscriptions) {
      try {
        telemetry.send('debug', 'publishing action', action);
        sub(action);
      } catch(ex) {
        telemetry.send('error', 'error while publishing action', ex);
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
