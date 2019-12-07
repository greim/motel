import UrlPattern from 'url-pattern';

const VACANCY_ATTRIBUTE = 'data-vacancy';
const VACANCY_ATTRIBUTE_SELECTOR = `[${VACANCY_ATTRIBUTE}]`;

export interface PatternMatch {
  [key: string]: string;
}

export interface MotelOptions {
  debug?: boolean;
}

export type PatternHandler<T> = (match: PatternMatch, send: Dispatcher<T>) => void | Promise<void>;
export type RegExpHandler<T> = (match: RegExpMatchArray, send: Dispatcher<T>) => void | Promise<void>;
export type Dispatcher<T> = (data: T) => void;
type Listener<T> = PatternListener<T> | RegExpListener<T>;

interface PatternListener<T> {
  is: 'pattern';
  pattern: UrlPattern;
  handler: PatternHandler<T>;
}

interface RegExpListener<T> {
  is: 'regex';
  regex: RegExp;
  handler: RegExpHandler<T>;
}

export class Motel<T = any> {

  public static create(opts: MotelOptions = {}) {
    return new Motel(opts);
  }

  private readonly debug: boolean;
  private readonly send: Dispatcher<T>;
  private readonly listeners: Listener<T>[];
  private readonly subscriptions: Dispatcher<T>[];
  private readonly dedupeCache: Map<string, Promise<any>>;
  private observer?: MutationObserver;

  private constructor(opts: MotelOptions) {
    this.debug = !!opts.debug;
    const listeners: Listener<T>[] = [];
    const subscriptions: Dispatcher<T>[] = [];
    const send = createPublishFunc(subscriptions, this.debug);
    const dedupeCache = new Map();
    this.send = send;
    this.listeners = listeners;
    this.subscriptions = subscriptions;
    this.dedupeCache = dedupeCache;
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
    if (this.observer) {
      throw new Error('already connected');
    }
    this.observer = new MutationObserver(muts => {
      for (let vacancy of iterateVacancies(muts)) {
        this.publish(vacancy);
      }
    });
    this.observer.observe(elmt, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [VACANCY_ATTRIBUTE],
    });
    const initialRootVacancy = elmt.getAttribute(VACANCY_ATTRIBUTE);
    if (initialRootVacancy) {
      this.publish(initialRootVacancy);
    }
    const initialDescVacancies = elmt.querySelectorAll(VACANCY_ATTRIBUTE_SELECTOR);
    for (const vacancyEl of initialDescVacancies) {
      const rawVacancy = vacancyEl.getAttribute(VACANCY_ATTRIBUTE);
      if (rawVacancy) {
        this.publish(rawVacancy);
      }
    }
  }

  public disconnect(): void {
    if (!this.observer) {
      throw new Error('not connected');
    }
    this.observer.disconnect();
    delete this.observer;
  }

  public subscribe(sub: Dispatcher<T>): void {
    const { subscriptions } = this;
    subscriptions.push(sub);
  }

  public publish(vacancy: string): Promise<any> {
    const { listeners, dedupeCache, send } = this;
    if (!dedupeCache.has(vacancy)) {
      const proms = [];
      for (let listener of listeners) {
        switch (listener.is) {
          case 'pattern': {
            const { pattern, handler } = listener;
            const match = processMatch(pattern.match(vacancy));
            if (match) {
              try {
                proms.push(Promise.resolve(handler(match, send)));
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
                proms.push(Promise.resolve(handler(match, send)));
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
      const prom = Promise.all(proms).catch(catcher);
      prom.then(() => dedupeCache.delete(vacancy));
      dedupeCache.set(vacancy, prom);
    }
    return dedupeCache.get(vacancy)!;
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

function* iterateVacancies(mutations: MutationRecord[]): IterableIterator<string> {
  const mutLen = mutations.length;
  for (let i=0; i<mutLen; i++) {
    const mut = mutations[i];
    if (mut.type === 'childList') {
      const len = mut.addedNodes.length;
      for (let j=0; j<len; j++) {
        const node = mut.addedNodes[j];
        if (isElement(node)) {
          const vacancy = node.getAttribute(VACANCY_ATTRIBUTE);
          if (vacancy) {
            yield vacancy;
          }
          // need to select into the subtree since mutation observer subtree
          // addedNodes only contains roots of an added subtree.
          const children = node.querySelectorAll(VACANCY_ATTRIBUTE_SELECTOR);
          const childLen = children.length;
          for (let k=0; k<childLen; k++) {
            const child = children[k];
            const childVacancy = child.getAttribute(VACANCY_ATTRIBUTE);
            if (childVacancy) {
              yield childVacancy;
            }
          }
        }
      }
    } else if (mut.type === 'attributes' && mut.attributeName === VACANCY_ATTRIBUTE) {
      if (isElement(mut.target)) {
        const vacancy = mut.target.getAttribute(VACANCY_ATTRIBUTE);
        if (vacancy) {
          yield vacancy;
        }
      }
    }
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

function isElement(node: Node): node is Element {
  return node.nodeType === 1;
}

function assertNever(nope: never): never {
  throw new Error(`value ${nope} found unexpectedly`);
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
