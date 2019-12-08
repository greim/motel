import UrlPattern from 'url-pattern';
import assertNever from './assert-never';
import { ElementLifecycle } from './element-lifecycle';
import { GateKeeper } from './gate-keeper';

const VACANCY_ATTRIBUTE = 'data-vacancy';

export interface PatternMatch {
  [key: string]: string;
}

export interface MotelOptions {
  debug?: boolean;
}

export type PatternHandler<T> = (
  match: PatternMatch,
  send: Dispatcher<T>,
  exitProm: Promise<void>,
) => void | Promise<void>;

export type RegExpHandler<T> = (
  match: RegExpMatchArray,
  send: Dispatcher<T>,
  exitProm: Promise<void>,
) => void | Promise<void>;

export type Dispatcher<T> = (data: T) => void;

type Listener<T> = PatternListener<T> | RegExpListener<T>;

interface PatternListener<T> {
  is: 'pattern';
  pattern: UrlPattern;
  handler: PatternHandler<T>;
  cleanup?: () => void;
}

interface RegExpListener<T> {
  is: 'regex';
  regex: RegExp;
  handler: RegExpHandler<T>;
  cleanup?: () => void;
}

export class Motel<T = any> {

  public static create(opts: MotelOptions = {}) {
    return new Motel(opts);
  }

  private readonly debug: boolean;
  private readonly send: Dispatcher<T>;
  private readonly listeners: Listener<T>[];
  private readonly subscriptions: Dispatcher<T>[];
  private lifecycle?: ElementLifecycle;

  private constructor(opts: MotelOptions) {
    this.debug = !!opts.debug;
    const listeners: Listener<T>[] = [];
    const subscriptions: Dispatcher<T>[] = [];
    const send = createPublishFunc(subscriptions, this.debug);
    this.send = send;
    this.listeners = listeners;
    this.subscriptions = subscriptions;
  }

  public listen(matcher: string, handler: PatternHandler<T>): void
  public listen(matcher: RegExp, handler: RegExpHandler<T>): void
  public listen(matcher: string | RegExp, handler: any): void {
    const { listeners } = this;
    if (typeof matcher === 'string') {
      const pattern = new UrlPattern(matcher);
      listeners.push({ is: 'pattern', pattern, handler });
    } else {
      const regex = matcher;
      listeners.push({ is: 'regex', regex, handler });
    }
  }

  public connect(elmt: Element): void {
    if (this.lifecycle) {
      throw new Error('already connected');
    }

    const gateKeeper = new GateKeeper();
    this.lifecycle = ElementLifecycle.of(elmt, VACANCY_ATTRIBUTE)
      .on('enter', (el, vacancy) => {
        const exitProm = gateKeeper.incr(vacancy);
        if (exitProm) {
          this.publish(vacancy, exitProm);
        }
      })
      .on('exit', (el, attr) => {
        gateKeeper.decr(attr);
      })
      .start();
  }

  public disconnect(): void {
    if (!this.lifecycle) {
      throw new Error('not connected');
    }
    this.lifecycle.stop();
    delete this.lifecycle;
  }

  public subscribe(sub: Dispatcher<T>): void {
    const { subscriptions } = this;
    subscriptions.push(sub);
  }

  public publish(vacancy: string, exitProm: Promise<void>): void {
    const { listeners, send } = this;
    const proms = [];
    for (let listener of listeners) {
      switch (listener.is) {
        case 'pattern': {
          const { pattern, handler } = listener;
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
          const { regex, handler } = listener;
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
          assertNever(listener);
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
