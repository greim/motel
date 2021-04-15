/* eslint-disable no-console */
const Motel = require('../lib/index').default;
const makeTest = require('./make-test');
const assert = require('assert');
const $ = require('./tquery');

makeTest('Catch an attribute mutation on root', async function() {
  const results = await vacancyTest({
    pattern: 'users/:id',
    trigger: el => $(el).vac('users/a'),
  });
  assert.deepStrictEqual(results, [{ id: 'a' }]);
});

makeTest('Catch an attribute mutation on child', async function() {
  const results = await vacancyTest({
    pattern: 'users/:id',
    trigger: el => $(el, 'b').vac('users/b'),
    el: '<div class="foo" id="bar"><b></b></div>',
  });
  assert.deepStrictEqual(results, [{ id: 'b' }]);
});

makeTest('Catch an attribute mutation on grandchild', async function() {
  const results = await vacancyTest({
    pattern: 'users/:id',
    trigger: el => $(el, 'b').vac('users/c'),
    el: '<div><div><b></b></div></div>',
  });
  assert.deepStrictEqual(results, [{ id: 'c' }]);
});

makeTest('Catch a child addition', async function() {
  const results = await vacancyTest({
    pattern: 'users/:id',
    trigger: el => $(el).append('<div data-vacancy="users/sdf"></div>'),
  });
  assert.deepStrictEqual(results, [{ id: 'sdf' }]);
});

makeTest('Catch a child addition (big vacancy)', async function() {
  const bigVac = 'abcdefg '.repeat(1000000);
  const html = `
    <span>
      <span>
        <span>
          <span>
            <span>
              <div data-vacancy="users/${bigVac}"></div>
            </span>
          </span>
        </span>
      </span>
    </span>
  `;
  const results = await vacancyTest({
    pattern: 'users/:id',
    triggers: [
      el => $(el).append(html),
      el => {el.innerHTML = '';},
      el => $(el).append(html),
      el => {el.innerHTML = '';},
    ],
  });
  assert.deepStrictEqual(results, [
    { id: bigVac },
    ['done', { id: bigVac }],
    { id: bigVac },
    ['done', { id: bigVac }],
  ]);
});

makeTest('Catch a grandchild addition', async function() {
  const results = await vacancyTest({
    pattern: 'users/:id',
    trigger: el => $(el).append('<div><div data-vacancy="users/hj"></div></div>'),
  });
  assert.deepStrictEqual(results, [{ id: 'hj' }]);
});

makeTest('Catch multiple attribute additions', async function() {
  const results = await vacancyTest({
    pattern: 'users/:id',
    trigger: el => $(el, 'b').each((e, idx) => $(e).attr('data-vacancy', `users/${idx++}`)),
    el: '<div><b></b><b></b><b></b></div>',
  });
  assert.deepStrictEqual(results, [
    { id: '0' },
    { id: '1' },
    { id: '2' },
  ]);
});

makeTest('Catch multiple node additions', async function() {
  const results = await vacancyTest({
    pattern: 'users/:id',
    trigger: el => $(el)
      .append([4, 5, 6]
        .map(n => `<b data-vacancy="users/${n}"></b>`)
        .join(''),
      ),
  });
  assert.deepStrictEqual(results, [
    { id: '4' },
    { id: '5' },
    { id: '6' },
  ]);
});

makeTest('Catch nested node additions', async function() {
  const results = await vacancyTest({
    pattern: 'users/:id',
    trigger: el => $(el).append(`
      <b data-vacancy="users/4">
        <br data-vacancy="users/5">
        <br data-vacancy="users/6">
      </b>`,
    ),
  });
  assert.deepStrictEqual(results, [
    { id: '4' },
    { id: '5' },
    { id: '6' },
  ]);
});

makeTest('Catch nested attribute mutations', async function() {
  const results = await vacancyTest({
    pattern: 'users/:id',
    trigger: el => {
      $(el, '.a').vac('users/a');
      $(el, '.b').vac('users/b');
    },
    el: '<div><i class="a"><i class="b"></i></i></div>',
  });
  assert.deepStrictEqual(results, [
    { id: 'a' },
    { id: 'b' },
  ]);
});

makeTest('Allow multiple sends', async function() {
  const results = await vacancyTest({
    pattern: 'users/:id',
    handler: (params, send) => { send(1); send(2); },
    trigger: el => $(el).vac('users/a'),
  });
  assert.deepStrictEqual(results, [1, 2]);
});

makeTest('Allow async sends', async function() {
  const results = await vacancyTest({
    pattern: 'users/:id',
    handler: async function(params, send) {
      send(1);
      await wait(1);
      send(2);
    },
    trigger: el => $(el).vac('users/a'),
  });
  assert.deepStrictEqual(results, [1, 2]);
});

makeTest('De-dupe vacancies', async function() {
  const results = await vacancyTest({
    pattern: 'users/:id',
    trigger: el => $(el, 'b').each(b => $(b).vac('users/a')),
    el: '<div><b></b><b></b><b></b></div>',
  });
  assert.deepStrictEqual(results, [{ id: 'a' }]);
});

makeTest('Catch both an attribute mutation and a node addition', async function() {
  const results = await vacancyTest({
    pattern: 'users/:id',
    trigger: el => $(el).vac('users/x').find('i').vac('users/a').append('<b data-vacancy="users/b"></b>'),
    el: '<div><i></i></div>',
  });
  assert.deepStrictEqual(results, [{ id: 'x' }, { id: 'a' }, { id: 'b' }]);
});

makeTest('publish initial vacancies on descendants', async function() {
  const results = await vacancyTest({
    pattern: 'users/:id',
    el: '<i><br data-vacancy="users/bar"/><br data-vacancy="users/baz"/></i>',
  });
  assert.deepStrictEqual(results, [{ id: 'bar' }, { id: 'baz' }]);
});

makeTest('publish initial vacancies on root', async function() {
  const results = await vacancyTest({
    pattern: 'users/:id',
    el: '<i data-vacancy="users/bar"><br/><br/></i>',
  });
  assert.deepStrictEqual(results, [{ id: 'bar' }]);
});

makeTest('publish initial vacancies on root and descendants', async function() {
  const results = await vacancyTest({
    pattern: 'users/:id',
    el: '<i data-vacancy="users/foo"><br data-vacancy="users/bar"/><br data-vacancy="users/baz"/></i>',
  });
  assert.deepStrictEqual(results, [{ id: 'foo' }, { id: 'bar' }, { id: 'baz' }]);
});

makeTest('does not signal exit', async function() {
  const results = await vacancyTest({
    pattern: 'users/:id',
    el: '<i data-vacancy="users/foo"></i>',
  });
  assert.deepStrictEqual(results, [{ id: 'foo' }]);
});

makeTest('handles vacancy changes', async function() {
  const results = await vacancyTest({
    pattern: 'users/:id',
    el: '<i><b></b></i>',
    triggers: [
      el => $(el, 'b').vac('users/foo'),
      el => $(el, 'b').vac('users/bar'),
      el => $(el, 'b').vac(null),
    ],
  });
  assert.deepStrictEqual(results, [
    { id: 'foo' },
    ['done', { id: 'foo' }],
    { id: 'bar' },
    ['done', { id: 'bar' }],
  ]);
});

makeTest('signals exit', async function() {
  const results = await vacancyTest({
    pattern: 'users/:id',
    el: '<i data-vacancy="users/foo"><b data-vacancy="users/bar"></b></i>',
    triggers: [
      el => $(el).vac(null),
      el => $(el, 'b').vac(null),
    ],
  });
  assert.deepStrictEqual(results, [
    { id: 'foo' },
    { id: 'bar' },
    ['done', { id: 'foo' }],
    ['done', { id: 'bar' }],
  ]);
});

makeTest('Only signal exit on last', async function() {
  const results = await vacancyTest({
    pattern: 'users/:id',
    el: `<div>
      <b class="a"></b>
      <b class="b"></b>
      <b class="c"></b>
    </div>`,
    triggers: [
      el => {
        $(el, '.a').vac('users/x');
        $(el, '.b').vac('users/x');
        $(el, '.c').vac('users/x');
      },
      el => $(el, '.a').vac(null),
      el => $(el, '.b').vac(null),
      (el, output) => {
        assert.deepStrictEqual(output, [{ id: 'x' }]);
      },
      el => $(el, '.c').vac(null),
    ],
  });
  assert.deepStrictEqual(results, [
    { id: 'x' },
    ['done', { id: 'x' }],
  ]);
});

makeTest('Handles an overlapping vacancy', async function() {
  const results = await vacancyTest({
    pattern: 'users/:id',
    el: `<div>
      <b class="a" data-vacancy="users/abc"></b>
      <b class="b"></b>
    </div>`,
    triggers: [
      el => {
        $(el, '.b').vac('users/abc');
        $(el, '.a').vac(null);
      },
      el => {
        $(el, '.b').vac(null);
      },
    ],
  });
  assert.deepStrictEqual(results, [
    { id: 'abc' },
    ['done', { id: 'abc' }],
  ]);
});

makeTest('Handles a reappearing vacancy', async function() {
  const results = await vacancyTest({
    pattern: 'users/:id',
    el: `<div>
      <b class="a" data-vacancy="users/abc"></b>
      <b class="b"></b>
    </div>`,
    triggers: [
      el => {
        $(el, '.a').vac(null);
        $(el, '.b').vac('users/abc');
      },
      el => {
        $(el, '.b').vac(null);
      },
    ],
  });
  console.log(results);
  assert.deepStrictEqual(results, [
    { id: 'abc' },
    ['done', { id: 'abc' }],
    { id: 'abc' },
    ['done', { id: 'abc' }],
  ]);
});

makeTest('Handles a wildcard vacancy', async function() {
  const results = await vacancyTest({
    pattern: '*',
    el: `<div>
      <b class="a" data-vacancy="users/abc"></b>
      <b class="b"></b>
    </div>`,
  });
  console.log(results);
  assert.deepStrictEqual(results, [
    'users/abc',
  ]);
});

// ----------------------------------------

async function defaultHandler(params, send, exit) {
  send(params);
  await exit;
  send(['done', params]);
}

function vacancyTest({
  pattern,
  handler = defaultHandler,
  connectOpts,
  trigger = () => {},
  triggers = [],
  el,
}) {
  return new Promise(async(resolve, reject) => {
    try {
      el = $(el).get();
      const vacancies = Motel.create({
        telemetryLevel: 'debug',
      });
      const output = [];
      vacancies.observe(pattern, handler);
      vacancies.subscribe(arg => output.push(arg));
      vacancies.connect(el, connectOpts);
      await trigger(el, output);
      await wait(100);
      for (const tr of triggers) {
        await tr(el, output);
        await wait(100);
      }
      vacancies.disconnect();
      await wait(100);
      resolve(output);
    } catch(ex) {
      reject(ex);
    }
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
