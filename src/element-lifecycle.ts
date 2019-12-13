import assertNever from './assert-never';

const MUTATION_OPTS = Object.freeze({
  childList: true,
  subtree: true,
  attributes: true,
  attributeOldValue: true,
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
 * and allows an observer to know when those events happen
 * along with the attribute value corresponding to that
 * name.
 *
 * Note that any enter/exit listeners added after the
 * start() method is called will potentially miss some
 * events, particularly for any attributes that exist on
 * or under root when start is called. To avoid this, add
 * listeners first and then call start():
 *
 *   ElementLifecycle.of(root)
 *     .on('enter', () => { ... })
 *     .on('exit', () => { ... })
 *     .start();
 */
export class ElementLifecycle {

  public static of(root: Element, attr: string) {
    return new ElementLifecycle(root, attr);
  }

  private mode: Mode;
  private readonly root: Element;
  private readonly attribute: string;
  private readonly attributeSelector: string;

  private constructor(root: Element, attr: string) {
    this.attribute = attr;
    this.attributeSelector = `[${attr}]`;
    this.root = root;
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
        for (const mut of muts) {
          switch (mut.type) {
            case 'childList': {
              for (const el of mut.removedNodes) {
                this.exitAll(el);
              }
              for (const el of mut.addedNodes) {
                this.enterAll(el);
              }
              break;
            }
            case 'attributes': {
              const el = mut.target;
              if (isElement(el)) {
                const oldAttr = mut.oldValue;
                if (oldAttr) {
                  this.exit(el, oldAttr);
                }
                const newAttr = el.getAttribute(this.attribute);
                if (newAttr) {
                  this.enter(el, newAttr);
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
    }
    this.mode = { is: 'done' };
  }

  private enter(el: Element, attr: string) {
    if (this.mode.is === 'running') {
      for (const entranceHandler of this.mode.entranceHandlers) {
        entranceHandler(el, attr);
      }
    } else {
      throw new Error(`lifecycle is ${this.mode.is}`);
    }
  }

  private exit(el: Element, attr: string) {
    if (this.mode.is === 'running') {
      for (const exitHandler of this.mode.exitHandlers) {
        exitHandler(el, attr);
      }
    } else {
      throw new Error(`lifecycle is ${this.mode.is}`);
    }
  }

  private enterAll(node: Node) {
    if (isElement(node)) {
      const attr = node.getAttribute(this.attribute);
      if (attr) {
        this.enter(node, attr);
      }
      const descendantVacancies = node.querySelectorAll(this.attributeSelector);
      for (const el of descendantVacancies) {
        const descAttr = el.getAttribute(this.attribute);
        if (descAttr) {
          this.enter(el, descAttr);
        }
      }
    }
  }

  private exitAll(node: Node) {
    if (isElement(node)) {
      const attr = node.getAttribute(this.attribute);
      if (attr) {
        this.exit(node, attr);
      }
      const descendantVacancies = node.querySelectorAll(this.attributeSelector);
      for (const el of descendantVacancies) {
        const descAttr = el.getAttribute(this.attribute);
        if (descAttr) {
          this.exit(el, descAttr);
        }
      }
    }
  }
}

function isElement(node: Node): node is Element {
  return node.nodeType === 1;
}
