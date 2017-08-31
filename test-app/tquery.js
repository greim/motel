
module.exports = $;

function $(...args) {
  return new Selection(...args);
}

function make(html = '<div></div>') {
  const parent = document.createElement('div');
  parent.innerHTML = html;
  const els = Array.from(parent.children);
  for (const el of els) {
    parent.removeChild(el);
  }
  return els;
}

class Selection {
  constructor(els = '<div></div>', sel) {
    if (typeof els === 'string') {
      els = make(els);
    }
    if (!Array.isArray(els)) {
      els = [els];
    }
    if (sel) {
      const arr = [];
      for (const e of els) {
        arr.push(...e.querySelectorAll(sel));
        this._selection = arr;
      }
    } else {
      this._selection = els;
    }
  }
  find(selector) {
    const els = [];
    for (let el of this._selection) {
      els.push(...el.querySelectorAll(selector));
    }
    return new Selection(els);
  }
  get(idx = 0) {
    return this._selection[idx];
  }
  eq(idx) {
    const els = [this._selection[idx]];
    return new Selection(els);
  }
  attr(name, val) {
    if (this._selection.length === 0) {
      return this;
    } else if (val === undefined) {
      return this._selection[0].getAttribute(name);
    } else {
      for (const el of this._selection) {
        el.setAttribute(name, val);
      }
      return this;
    }
  }
  vac(val) {
    return this.attr('data-vacancy', val);
  }
  append(els) {
    if (this._selection.length === 0) {
      return this;
    } else {
      if (typeof els === 'string') {
        els = make(els);
      }
      if (!Array.isArray(els)) {
        els = [els];
      }
      for (const el of els) {
        this._selection[0].appendChild(el);
      }
      return this;
    }
  }
  each(fn) {
    let i = 0;
    for (const el of this) {
      fn(el, i++);
    }
    return this;
  }
  [Symbol.iterator]() {
    return this._selection[Symbol.iterator]();
  }
}
