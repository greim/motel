module.exports = motel;

const PRIV = new WeakMap();

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
    if (!pattern || typeof pattern.test !== 'function') {
      throw new Error('pattern not a regex');
    }
    if (typeof handler !== 'function') {
      throw new Error('handler not a function');
    }
    const { watchers } = PRIV.get(this);
    watchers.push({ pattern, handler });
  }

  observe(elmt = document.documentElement) {
    const _ = PRIV.get(this);
    if (_.mutationObserver) {
      throw new Error('already connected');
    }
    _.mutationObserver = new MutationObserver(muts => {
      for (const mut of muts) {
        for (const node of mut.addedNodes) {
          const vacancy = node.getAttribute('data-vacancy');
          if (vacancy) {
            _.dedupeSend(vacancy);
          }
        }
      }
    });
    _.mutationObserver.observe(elmt, {
      childList: true,
      subtree: true,
    });
  }

  unobserve() {
    const _ = PRIV.get(this);
    if (!_.mutationObserver) {
      throw new Error('not connected');
    }
    _.mutationObserver.disconnect();
    delete _.mutationObserver;
  }

  subscribe(sub) {
    if (typeof sub !== 'function') {
      throw new Error('not a function');
    }
    const { subscriptions } = PRIV.get(this);
    subscriptions.push(sub);
  }

  send(vacancy) {
    if (typeof vacancy !== 'string') {
      return Promise.reject(new Error('not a string'));
    }
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
