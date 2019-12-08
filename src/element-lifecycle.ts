import assertNever from './assert-never';

const VACANCY_ATTRIBUTE = 'data-vacancy';
const VACANCY_ATTRIBUTE_SELECTOR = `[${VACANCY_ATTRIBUTE}]`;
const MUTATION_OPTS = Object.freeze({
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: [VACANCY_ATTRIBUTE],
});

type EventType = 'enter' | 'exit';
type ElementFn = (el: Element) => void;
type Mode = WaitingMode | RunningMode;
type BacklogItem = EntranceItem | ExitItem;

interface EntranceItem {
  is: 'entrance';
  el: Element;
}

interface ExitItem {
  is: 'exit';
  el: Element;
}

interface WaitingMode {
  running: false;
  readonly backlog: BacklogItem[];
  readonly entranceHandlers: Array<ElementFn>;
  readonly exitHandlers: Array<ElementFn>;
}

interface RunningMode {
  running: true;
  readonly entranceHandlers: Array<ElementFn>;
  readonly exitHandlers: Array<ElementFn>;
  readonly observer: MutationObserver;
}

export class ElementLifecycle {

  private mode: Mode;
  private readonly root: Element;

  constructor(root: Element) {
    this.root = root;
    this.mode = {
      running: false,
      backlog: [],
      entranceHandlers: [],
      exitHandlers: [],
    };
    this.enterNode(root);
  }

  public on(
    type: EventType,
    handler: ElementFn,
  ): ElementLifecycle {
    switch (type) {
      case 'enter': {
        this.mode.entranceHandlers.push(handler);
        return this;
      }
      case 'exit': {
        this.mode.exitHandlers.push(handler);
        return this;
      }
      default: {
        return assertNever(type);
      }
    }
  }

  public start() {
    if (!this.mode.running) {
      const {
        backlog,
        entranceHandlers,
        exitHandlers,
      } = this.mode;
      for (const item of backlog) {
        if (item.is === 'entrance') {
          entranceHandlers.forEach(handler => handler(item.el));
        } else {
          exitHandlers.forEach(handler => handler(item.el));
        }
      }
      const observer = new MutationObserver(muts => {
        for (const mutation of muts) {
          switch (mutation.type) {
            case 'childList': {
              for (const el of mutation.removedNodes) {
                this.exitNode(el);
              }
              for (const el of mutation.addedNodes) {
                this.enterNode(el);
              }
              break;
            }
            case 'attributes': {
              const el = mutation.target;
              if (isElement(el)) {
                if (el.hasAttribute(VACANCY_ATTRIBUTE)) {
                  this.enter(el);
                } else {
                  this.exit(el);
                }
              }
              break;
            }
          }
        }
      });
      observer.observe(this.root, MUTATION_OPTS);
      this.mode = {
        running: true,
        entranceHandlers,
        exitHandlers,
        observer,
      };
    }
  }

  public stop() {
    if (this.mode.running) {
      const {
        entranceHandlers,
        exitHandlers,
        observer,
      } = this.mode;
      observer.disconnect();
      this.mode = {
        running: false,
        backlog: [],
        entranceHandlers,
        exitHandlers,
      };
    }
  }

  private enter(...els: Element[]) {
    if (this.mode.running) {
      for (const handler of this.mode.entranceHandlers) {
        for (const el of els) {
          handler(el);
        }
      }
    } else {
      for (const el of els) {
        const item: EntranceItem = { is: 'entrance', el };
        this.mode.backlog.push(item);
      }
    }
  }

  private exit(...els: Element[]) {
    if (this.mode.running) {
      for (const handler of this.mode.exitHandlers) {
        for (const el of els) {
          handler(el);
        }
      }
    } else {
      for (const el of els) {
        const item: ExitItem = { is: 'exit', el };
        this.mode.backlog.push(item);
      }
    }
  }

  private enterNode(node: Node) {
    if (isElement(node)) {
      if (node.hasAttribute(VACANCY_ATTRIBUTE)) {
        this.enter(node);
      }
      const descendantVacancies = node.querySelectorAll(VACANCY_ATTRIBUTE_SELECTOR);
      this.enter(...descendantVacancies);
    }
  }

  private exitNode(node: Node) {
    if (isElement(node)) {
      if (node.hasAttribute(VACANCY_ATTRIBUTE)) {
        this.exit(node);
      }
      const descendantVacancies = node.querySelectorAll(VACANCY_ATTRIBUTE_SELECTOR);
      this.exit(...descendantVacancies);
    }
  }
}

function isElement(node: Node): node is Element {
  return node.nodeType === 1;
}
