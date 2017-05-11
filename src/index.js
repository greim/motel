module.exports = createMotel;

const UrlPattern = require('url-pattern');

const PRIV = new WeakMap();
const VACANCY_ATTRIBUTE = 'data-vacancy';
const VACANCY_ATTRIBUTE_SELECTOR = `[${VACANCY_ATTRIBUTE}]`;
const IS_BROWSER = typeof window !== 'undefined';

function createMotel() {
  return new Motel();
}

class Motel {

  constructor() {
    const vacancyObservers = [];
    const subscriptions = [];
    const publish = createPublishFunc(subscriptions);
    const dedupeCache = new Map();
    PRIV.set(this, { publish, vacancyObservers, subscriptions, dedupeCache });
  }

  listen(pattern, handler) {
    const { vacancyObservers } = PRIV.get(this);
    if (typeof pattern === 'string') {
      pattern = new UrlPattern(pattern);
    }
    vacancyObservers.push({ pattern, handler });
  }

  connect(elmt) {
    const _ = PRIV.get(this);
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
      attributeFilter: [VACANCY_ATTRIBUTE],
    });
  }

  disconnect() {
    const _ = PRIV.get(this);
    if (!_.observer) {
      throw new Error('not connected');
    }
    _.observer.disconnect();
    delete _.observer;
  }

  subscribe(sub) {
    const { subscriptions } = PRIV.get(this);
    subscriptions.push(sub);
  }

  publish(vacancy) {
    const { vacancyObservers, dedupeCache, publish } = PRIV.get(this);
    if (!dedupeCache.has(vacancy)) {
      const proms = [];
      for (let { pattern, handler } of vacancyObservers) {
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
        window.console.log(`unmatched vacancy: ${vacancy}`);
      }
      const prom = Promise.all(proms).catch(genericCatcher);
      prom.then(() => dedupeCache.delete(vacancy));
      dedupeCache.set(vacancy, prom);
    }
    return dedupeCache.get(vacancy);
  }
}

function genericCatcher(err) {
  if (IS_BROWSER) {
    window.console.error(err.stack);
  }
}

function* iterateVacancies(mutations) {
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
          } else {
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
      }
    } else if (mut.type === 'attributes' && mut.attributeName === VACANCY_ATTRIBUTE) {
      const vacancy = mut.target.getAttribute(VACANCY_ATTRIBUTE);
      yield vacancy;
    }
  }
}

function createPublishFunc(subscriptions) {
  return action => {
    for (let sub of subscriptions) {
      try {
        sub(action);
      } catch(ex) {
        genericCatcher(ex);
      }
    }
  };
}
