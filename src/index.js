module.exports = motel;

const PRIV = new WeakMap();
const VACANCY_ATTRIBUTE = 'data-vacancy';

function motel() {
  return new Motel();
}

class Motel {

  constructor() {
    const watchers = [];
    const subscriptions = [];
    const dedupeCache = new Map();
    PRIV.set(this, { watchers, subscriptions, dedupeCache });
  }

  vacancy(pattern, handler) {
    const { watchers } = PRIV.get(this);
    watchers.push({ pattern, handler });
  }

  observe(elmt) {
    const _ = PRIV.get(this);
    if (_.observer) {
      throw new Error('already connected');
    }
    _.observer = new MutationObserver(muts => {
      for (const vacancy of vacancies(muts)) {
        this.publish(vacancy);
      }
    });
    _.observer.observe(elmt, {
      childList: true,
      subtree: true,
      attributeFilter: [VACANCY_ATTRIBUTE],
    });
  }

  unobserve() {
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
    const { watchers, subscriptions, dedupeCache } = PRIV.get(this);
    if (!dedupeCache.has(vacancy)) {
      const proms = watchers
        .filter(({ pattern }) => pattern.test(vacancy))
        .map(({ pattern, handler }) => {
          const match = Array.from(vacancy.match(pattern));
          const dispatch = action => {
            for (const sub of subscriptions) {
              try {
                sub(action);
              } catch(ex) {
                genericCatcher(ex);
              }
            }
          };
          try {
            return Promise.resolve(handler(match, dispatch));
          } catch(ex) {
            return Promise.reject(ex);
          }
        });
      const prom = Promise.all(proms).catch(genericCatcher);
      prom.then(() => dedupeCache.delete(vacancy));
      dedupeCache.set(vacancy, prom);
    }
    return dedupeCache.get(vacancy);
  }
}

function genericCatcher(err) {
  if (typeof window !== 'undefined') {
    window.console.error(err.stack);
  }
}

function* vacancies(mutations) {
  const mutLen = mutations.length;
  for (let i=0; i<mutLen; i++) {
    const mut = mutations[i];
    if (mut.type === 'childList') {
      let len = mut.addedNodes.length;
      for (let j=0; j<len; j++) {
        const node = mut.addedNodes[j];
        if (node.hasAttribute(VACANCY_ATTRIBUTE)) {
          yield node.getAttribute(VACANCY_ATTRIBUTE);
        }
      }
    } else if (mut.type === 'attributes' && mut.attributeName === VACANCY_ATTRIBUTE) {
      const vacancy = mut.target.getAttribute(VACANCY_ATTRIBUTE);
      yield vacancy;
    }
  }
}
