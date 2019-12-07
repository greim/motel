import UrlPattern from 'url-pattern';

const VACANCY_ATTRIBUTE = 'data-vacancy';
const VACANCY_ATTRIBUTE_SELECTOR = `[${VACANCY_ATTRIBUTE}]`;
const IS_BROWSER = typeof window !== 'undefined';

export default function createMotel() {
  return new Motel();
}

interface MotelOpts {
  publish: any;
  listeners: any;
  subscriptions: any;
  dedupeCache: any;
  observer?: any;
}

interface ConnectOpts {
  ignoreInitial?: boolean;
}

class Motel {

  private opts: MotelOpts

  constructor() {
    const listeners: any = [];
    const subscriptions: any = [];
    const publish = createPublishFunc(subscriptions);
    const dedupeCache = new Map();
    this.opts = { publish, listeners, subscriptions, dedupeCache };
  }

  listen(pattern: any, handler: any) {
    const { listeners } = this.opts;
    if (typeof pattern === 'string') {
      pattern = new UrlPattern(pattern);
    }
    listeners.push({ pattern, handler });
  }

  connect(elmt: Element, { ignoreInitial }: ConnectOpts = {}) {
    const _ = this.opts;
    if (_.observer) {
      throw new Error('already connected');
    }
    _.observer = new MutationObserver(muts => {
      for (let vacancy of iterateVacancies(muts)) {
        this.publish(vacancy);
      }
    });
    _.observer.observe(elmt, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [VACANCY_ATTRIBUTE],
    });
    if (!ignoreInitial) {
      if (elmt.hasAttribute(VACANCY_ATTRIBUTE)) {
        const initialRootVacancy = elmt.getAttribute(VACANCY_ATTRIBUTE);
        this.publish(initialRootVacancy);
      }
      const initialDescVacancies = elmt.querySelectorAll(VACANCY_ATTRIBUTE_SELECTOR);
      for (const vacancyEl of initialDescVacancies) {
        const rawVacancy = vacancyEl.getAttribute(VACANCY_ATTRIBUTE);
        this.publish(rawVacancy);
      }
    }
  }

  disconnect() {
    const _ = this.opts;
    if (!_.observer) {
      throw new Error('not connected');
    }
    _.observer.disconnect();
    delete _.observer;
  }

  subscribe(sub: any) {
    const { subscriptions } = this.opts;
    subscriptions.push(sub);
  }

  publish(vacancy: any) {
    const { listeners, dedupeCache, publish } = this.opts;
    if (!dedupeCache.has(vacancy)) {
      const proms = [];
      for (let { pattern, handler } of listeners) {
        let match;
        if (pattern.match) {
          match = pattern.match(vacancy); // url-pattern
        } else {
          match = vacancy.match(pattern); // regex
        }
        if (match) {
          try {
            proms.push(Promise.resolve(handler(match, publish)));
          } catch(ex) {
            proms.push(Promise.reject(ex));
          }
        }
      }
      if (proms.length === 0 && IS_BROWSER) {
        window.console.log(`unmatched vacancy: ${JSON.stringify(vacancy)}`);
      }
      const prom = Promise.all(proms).catch(genericCatcher);
      prom.then(() => dedupeCache.delete(vacancy));
      dedupeCache.set(vacancy, prom);
    }
    return dedupeCache.get(vacancy);
  }
}

function genericCatcher(err: any) {
  if (IS_BROWSER) {
    window.console.error(err.stack);
  }
}

function* iterateVacancies(mutations: any) {
  const mutLen = mutations.length;
  for (let i=0; i<mutLen; i++) {
    const mut = mutations[i];
    if (mut.type === 'childList') {
      let len = mut.addedNodes.length;
      for (let j=0; j<len; j++) {
        const node = mut.addedNodes[j];
        if (node.nodeType === 1) {
          if (node.hasAttribute(VACANCY_ATTRIBUTE)) {
            yield node.getAttribute(VACANCY_ATTRIBUTE);
          }
          // need to select into the subtree since mutation observer subtree
          // addedNodes only contains roots of an added subtree.
          const children = node.querySelectorAll(VACANCY_ATTRIBUTE_SELECTOR);
          const childLen = children.length;
          for (let k=0; k<childLen; k++) {
            const child = children[k];
            yield child.getAttribute(VACANCY_ATTRIBUTE);
          }
        }
      }
    } else if (mut.type === 'attributes' && mut.attributeName === VACANCY_ATTRIBUTE) {
      const vacancy = mut.target.getAttribute(VACANCY_ATTRIBUTE);
      yield vacancy;
    }
  }
}

function createPublishFunc(subscriptions: any) {
  return (action: any) => {
    for (let sub of subscriptions) {
      try {
        sub(action);
      } catch(ex) {
        genericCatcher(ex);
      }
    }
  };
}
