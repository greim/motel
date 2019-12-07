import UrlPattern from 'url-pattern';

const VACANCY_ATTRIBUTE = 'data-vacancy';
const VACANCY_ATTRIBUTE_SELECTOR = `[${VACANCY_ATTRIBUTE}]`;
const IS_BROWSER = typeof window !== 'undefined';

export default function createMotel() {
  return new Motel();
}

interface UrlMatch {
  [key: string]: string;
}

type Listener<T> = PatternListener<T> | RegexListener<T>;
type PatternHandlerFn<T> = (match: UrlMatch, send: (thing: T) => void) => void | Promise<void>;
type RegexHandlerFn<T> = (match: RegExpMatchArray, send: (thing: T) => void) => void | Promise<void>;
type SendFn<T> = (data: T) => void;

interface PatternListener<T> {
  is: 'pattern';
  pattern: UrlPattern;
  handler: PatternHandlerFn<T>;
}

interface RegexListener<T> {
  is: 'regex';
  regex: RegExp;
  handler: RegexHandlerFn<T>;
}

interface MotelOpts<T> {
  send: SendFn<T>;
  listeners: Listener<T>[];
  subscriptions: SendFn<T>[];
  dedupeCache: Map<string, Promise<any>>;
  observer?: MutationObserver;
}

class Motel<T = any> {

  private readonly send: SendFn<T>;
  private readonly listeners: Listener<T>[];
  private readonly subscriptions: SendFn<T>[];
  private readonly dedupeCache: Map<string, Promise<any>>;
  private observer?: MutationObserver;

  constructor() {
    const listeners: Listener<T>[] = [];
    const subscriptions: SendFn<T>[] = [];
    const send = createPublishFunc(subscriptions);
    const dedupeCache = new Map();
    this.send = send;
    this.listeners = listeners;
    this.subscriptions = subscriptions;
    this.dedupeCache = dedupeCache;
  }

  listen(matcher: string, handler: PatternHandlerFn<T>): void
  listen(matcher: RegExp, handler: RegexHandlerFn<T>): void
  listen(matcher: string | RegExp, handler: any): void {
    const { listeners } = this;
    if (typeof matcher === 'string') {
      const pattern = new UrlPattern(matcher);
      listeners.push({ is: 'pattern', pattern, handler });
    } else {
      const regex = matcher;
      listeners.push({ is: 'regex', regex, handler });
    }
  }

  connect(elmt: Element) {
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

  disconnect() {
    if (!this.observer) {
      throw new Error('not connected');
    }
    this.observer.disconnect();
    delete this.observer;
  }

  subscribe(sub: SendFn<T>) {
    const { subscriptions } = this;
    subscriptions.push(sub);
  }

  publish(vacancy: string): Promise<any> {
    const { listeners, dedupeCache, send } = this;
    if (!dedupeCache.has(vacancy)) {
      const proms = [];
      for (let listener of listeners) {
        switch (listener.is) {
          case 'pattern': {
            const { pattern, handler } = listener;
            const match = pattern.match(vacancy);
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
      if (proms.length === 0 && IS_BROWSER) {
        window.console.log(`unhandled vacancy: ${JSON.stringify(vacancy)}`);
      }
      const prom = Promise.all(proms).catch(genericCatcher);
      prom.then(() => dedupeCache.delete(vacancy));
      dedupeCache.set(vacancy, prom);
    }
    return dedupeCache.get(vacancy)!;
  }
}

function genericCatcher<E extends Error>(err: E) {
  if (IS_BROWSER) {
    window.console.error(err.stack);
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

function createPublishFunc<T>(subscriptions: SendFn<T>[]): SendFn<T> {
  return (action: T) => {
    for (let sub of subscriptions) {
      try {
        sub(action);
      } catch(ex) {
        genericCatcher(ex);
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
