import assertNever from './assert-never';

const MUTATION_OPTS = Object.freeze({
  childList: true,
  subtree: true,
  attributes: true,
});

type EventType = 'enter' | 'exit';
type ElementFn = (el: Element, attr: string) => void;
type Mode = WaitingMode | RunningMode | DoneMode;

interface WaitingMode {
  is: 'waiting';
  readonly entranceHandlers: Array<ElementFn>;
  readonly exitHandlers: Array<ElementFn>;
}

interface RunningMode {
  is: 'running';
  readonly entranceHandlers: Array<ElementFn>;
  readonly exitHandlers: Array<ElementFn>;
  readonly observer: MutationObserver;
}

interface DoneMode {
  is: 'done';
}

/**
 * An instance of this class tracks entrances and exits
 * in the DOM of elements with a given attribute name
 * and allows a listener to know when those events happen
 * along with the attribute value corresponding to that
 * name.
 */
export class ElementLifecycle {

  public static of(root: Element, attr: string) {
    return new ElementLifecycle(root, attr);
  }

  private mode: Mode;
  private readonly root: Element;
  private readonly attribute: string;
  private readonly attributeSelector: string;
  private readonly elements: WeakMap<Element, string>

  private constructor(root: Element, attr: string) {
    this.attribute = attr;
    this.attributeSelector = `[${attr}]`;
    this.root = root;
    this.elements = new WeakMap();
    this.mode = {
      is: 'waiting',
      entranceHandlers: [],
      exitHandlers: [],
    };
  }

  public on(type: EventType, handler: ElementFn): ElementLifecycle {
    if (this.mode.is !== 'done') {
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
    } else {
      throw new Error('lifecycle is finished');
    }
  }

  public start(): ElementLifecycle {
    if (this.mode.is === 'done') {
      throw new Error('lifecycle is finished');
    } else if (this.mode.is === 'waiting') {
      const { entranceHandlers, exitHandlers } = this.mode;
      const observer = new MutationObserver(muts => {
        for (const mutation of muts) {
          switch (mutation.type) {
            case 'childList': {
              for (const el of mutation.removedNodes) {
                this.exitAll(el);
              }
              for (const el of mutation.addedNodes) {
                this.enterAll(el);
              }
              break;
            }
            case 'attributes': {
              const el = mutation.target;
              if (isElement(el)) {
                if (el.hasAttribute(this.attribute)) {
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
      observer.observe(this.root, {
        ...MUTATION_OPTS,
        attributeFilter: [this.attribute],
      });
      this.mode = {
        is: 'running',
        entranceHandlers,
        exitHandlers,
        observer,
      };
      this.enterAll(this.root);
    }
    return this;
  }

  public stop() {
    if (this.mode.is === 'running') {
      const { observer } = this.mode;
      observer.disconnect();
    } else {
      this.mode = { is: 'done' };
    }
  }

  private enter(...els: Element[]) {
    for (const el of els) {
      const attr = el.getAttribute(this.attribute);
      if (attr !== null) {
        this.elements.set(el, attr);
        if (this.mode.is === 'running') {
          for (const handler of this.mode.entranceHandlers) {
            handler(el, attr);
          }
        }
      }
    }
  }

  private exit(...els: Element[]) {
    for (const el of els) {
      const attr = this.elements.get(el);
      if (attr !== undefined) {
        if (this.mode.is === 'running') {
          for (const handler of this.mode.exitHandlers) {
            handler(el, attr);
          }
        }
      }
    }
  }

  private enterAll(node: Node) {
    if (isElement(node)) {
      if (node.hasAttribute(this.attribute)) {
        this.enter(node);
      }
      const descendantVacancies = node.querySelectorAll(this.attributeSelector);
      this.enter(...descendantVacancies);
    }
  }

  private exitAll(node: Node) {
    if (isElement(node)) {
      if (node.hasAttribute(this.attribute)) {
        this.exit(node);
      }
      const descendantVacancies = node.querySelectorAll(this.attributeSelector);
      this.exit(...descendantVacancies);
    }
  }
}

function isElement(node: Node): node is Element {
  return node.nodeType === 1;
}
