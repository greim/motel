const motel = require('../src/index');
const makeTest = require('./make-test');
const assert = require('assert');


makeTest('Catch an attribute mutation on root', async function() {
  const elmt = document.createElement('div');
  const results = await vacancyTest('users/:id', (params, send) => {
    send(params);
  }, () => {
    elmt.setAttribute('data-vacancy', 'users/a');
  }, elmt);
  assert.deepEqual(results, [{ id: 'a' }]);
});

makeTest('Catch an attribute mutation on child', async function() {
  const elmt = document.createElement('div');
  const child = document.createElement('div');
  elmt.appendChild(child);
  const results = await vacancyTest('users/:id', (params, send) => {
    send(params);
  }, () => {
    child.setAttribute('data-vacancy', 'users/b');
  }, elmt);
  assert.deepEqual(results, [{ id: 'b' }]);
});

makeTest('Catch an attribute mutation on grandchild', async function() {
  const elmt = document.createElement('div');
  const child = document.createElement('div');
  const grandchild = document.createElement('div');
  elmt.appendChild(child);
  child.appendChild(grandchild);
  const results = await vacancyTest('users/:id', (params, send) => {
    send(params);
  }, () => {
    grandchild.setAttribute('data-vacancy', 'users/c');
  }, elmt);
  assert.deepEqual(results, [{ id: 'c' }]);
});

makeTest('Catch a child addition', async function() {
  const elmt = document.createElement('div');
  const results = await vacancyTest('users/:id', (params, send) => {
    send(params);
  }, () => {
    const child = document.createElement('div');
    child.setAttribute('data-vacancy', 'users/sdf');
    elmt.appendChild(child);
  }, elmt);
  assert.deepEqual(results, [{ id: 'sdf' }]);
});

makeTest('Catch a grandchild addition', async function() {
  const elmt = document.createElement('div');
  const results = await vacancyTest('users/:id', (params, send) => {
    send(params);
  }, () => {
    const child = document.createElement('div');
    const grandchild = document.createElement('div');
    child.appendChild(grandchild);
    grandchild.setAttribute('data-vacancy', 'users/hj');
    elmt.appendChild(child);
  }, elmt);
  assert.deepEqual(results, [{ id: 'hj' }]);
});

makeTest('Catch multiple attribute additions', async function() {
  const elmt = make('<div></div><div></div><div></div>');
  const results = await vacancyTest('users/:id', (params, send) => {
    send(params);
  }, () => {
    let i = 0;
    for (const desc of elmt.querySelectorAll('div')) {
      desc.setAttribute('data-vacancy', `users/${i++}`);
    }
  }, elmt);
  assert.deepEqual(results, [
    { id: '0' },
    { id: '1' },
    { id: '2' },
  ]);
});

makeTest('Catch multiple node additions', async function() {
  const elmt = make();
  const results = await vacancyTest('users/:id', (params, send) => {
    send(params);
  }, () => {
    elmt.innerHTML = `
      <div data-vacancy="users/4"></div>
      <div data-vacancy="users/5"></div>
      <div data-vacancy="users/6"></div>
    `;
  }, elmt);
  assert.deepEqual(results, [
    { id: '4' },
    { id: '5' },
    { id: '6' },
  ]);
});

makeTest('Catch nested node additions', async function() {
  const elmt = make();
  const results = await vacancyTest('users/:id', (params, send) => {
    send(params);
  }, () => {
    elmt.innerHTML = `
      <div data-vacancy="users/4">
        <div data-vacancy="users/5"></div>
        <div data-vacancy="users/6"></div>
      </div>
    `;
  }, elmt);
  assert.deepEqual(results, [
    { id: '4' },
    { id: '5' },
    { id: '6' },
  ]);
});

makeTest('Catch nested attribute mutations', async function() {
  const elmt = make('<i class="a"><i class="b"></i></i>');
  const results = await vacancyTest('users/:id', (params, send) => {
    send(params);
  }, () => {
    elmt.querySelector('.a').setAttribute('data-vacancy', 'users/a');
    elmt.querySelector('.b').setAttribute('data-vacancy', 'users/b');
  }, elmt);
  assert.deepEqual(results, [
    { id: 'a' },
    { id: 'b' },
  ]);
});

makeTest('Allow multiple sends', async function() {
  const elmt = document.createElement('div');
  const results = await vacancyTest('users/:id', (params, send) => {
    send(1);
    send(2);
  }, () => {
    elmt.setAttribute('data-vacancy', 'users/a');
  }, elmt);
  assert.deepEqual(results, [1, 2]);
});

makeTest('Allow async sends', async function() {
  const elmt = document.createElement('div');
  const results = await vacancyTest('users/:id', async function(params, send) {
    send(1);
    await wait(1);
    send(2);
  }, () => {
    elmt.setAttribute('data-vacancy', 'users/a');
  }, elmt);
  assert.deepEqual(results, [1, 2]);
});

// ----------------------------------------

function make(html = '') {
  const el = document.createElement('div');
  el.innerHTML = html;
  return el;
}

function vacancyTest(pattern, handler, trigger, el) {
  return new Promise(resolve => {
    const vacancies = motel();
    const output = [];
    vacancies.listen(pattern, handler);
    vacancies.subscribe(arg => output.push(arg));
    vacancies.connect(el);
    trigger();
    wait(100).then(() => resolve(output));
  });
}

function wait(t) {
  return new Promise(resolve => setTimeout(resolve, t));
}

async function autoExecute() {
  for (const button of document.querySelectorAll('button.run')) {
    button.click();
  }
}

autoExecute();
