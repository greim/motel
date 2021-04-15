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

        // Both Chrome and Firefox can sometimes send mutation
        // lists which can contain duplicate elements in their
        // subtrees. These sets help remove those duplicates.
        const dedupeExit = new Set();
        const dedupeEnter = new Set();

        for (const mut of muts) {
          switch (mut.type) {
            case 'childList': {
              for (const [el, attr] of this.subtree(mut.removedNodes, dedupeExit)) {
                this.exit(el, attr);
              }
              for (const [el, attr] of this.subtree(mut.addedNodes, dedupeEnter)) {
                this.enter(el, attr);
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
      for (const [el, attr] of this.subtree([this.root], new Set())) {
        this.enter(el, attr);
      }
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

  /** Traverse the subtree of an added or removed
   * node looking for vacancies. Ensure duplicates
   * aren't reported using the given dedupe set. */
  private *subtree(
    nodes: Iterable<Node>,
    dedupe: Set<any>,
  ): IterableIterator<[Element, string]> {
    for (const node of nodes) {
      if (isElement(node)) {
        const attr = node.getAttribute(this.attribute);
        if (attr !== null) {
          if (!dedupe.has(node)) {
            yield [node, attr];
            dedupe.add(node);
          }
        }
        const descendants = node.querySelectorAll(this.attributeSelector);
        for (const desc of descendants) {
          const descAttr = desc.getAttribute(this.attribute)!;
          if (!dedupe.has(desc)) {
            yield [desc, descAttr];
            dedupe.add(desc);
          }
        }
      }
    }
  }
}

function isElement(node: Node): node is Element {
  return node.nodeType === 1;
}
