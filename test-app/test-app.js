const { default: motel } = require('../lib/index');
const makeTest = require('./make-test');
const assert = require('assert');
const $ = require('./tquery');

makeTest('Catch an attribute mutation on root', async function() {
  const results = await vacancyTest({
    pattern: 'users/:id',
    trigger: el => $(el).vac('users/a'),
  });
  assert.deepEqual(results, [{ id: 'a' }]);
});

makeTest('Catch an attribute mutation on child', async function() {
  const results = await vacancyTest({
    pattern: 'users/:id',
    trigger: el => $(el, 'b').vac('users/b'),
    el: '<div><b></b></div>',
  });
  assert.deepEqual(results, [{ id: 'b' }]);
});

makeTest('Catch an attribute mutation on grandchild', async function() {
  const results = await vacancyTest({
    pattern: 'users/:id',
    trigger: el => $(el, 'b').vac('users/c'),
    el: '<div><div><b></b></div></div>',
  });
  assert.deepEqual(results, [{ id: 'c' }]);
});

makeTest('Catch a child addition', async function() {
  const results = await vacancyTest({
    pattern: 'users/:id',
    trigger: el => $(el).append('<div data-vacancy="users/sdf"></div>'),
  });
  assert.deepEqual(results, [{ id: 'sdf' }]);
});

makeTest('Catch a grandchild addition', async function() {
  const results = await vacancyTest({
    pattern: 'users/:id',
    trigger: el => $(el).append('<div><div data-vacancy="users/hj"></div></div>'),
  });
  assert.deepEqual(results, [{ id: 'hj' }]);
});

makeTest('Catch multiple attribute additions', async function() {
  const results = await vacancyTest({
    pattern: 'users/:id',
    trigger: el => $(el, 'b').each((e, idx) => $(e).attr('data-vacancy', `users/${idx++}`)),
    el: '<div><b></b><b></b><b></b></div>',
  });
  assert.deepEqual(results, [
    { id: '0' },
    { id: '1' },
    { id: '2' },
  ]);
});

makeTest('Catch multiple node additions', async function() {
  const results = await vacancyTest({
    pattern: 'users/:id',
    trigger: el => $(el).append([4, 5, 6].map(n => `<b data-vacancy="users/${n}"></b>`).join('')),
  });
  assert.deepEqual(results, [
    { id: '4' },
    { id: '5' },
    { id: '6' },
  ]);
});

makeTest('Catch nested node additions', async function() {
  const results = await vacancyTest({
    pattern: 'users/:id',
    trigger: el => $(el).append('<b data-vacancy="users/4"><br data-vacancy="users/5"><br data-vacancy="users/6"></b>'),
  });
  assert.deepEqual(results, [
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
  assert.deepEqual(results, [
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
  assert.deepEqual(results, [1, 2]);
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
  assert.deepEqual(results, [1, 2]);
});

makeTest('Gracefully handle malformed JSON', async function() {
  const results = await vacancyTest({
    pattern: 'users/:id',
    trigger: el => $(el).attr('data-vacancy', JSON.stringify(['users/a', 'users/b']) + '}}}'),
  });
  assert.deepEqual(results, []);
});

makeTest('De-dupe vacancies', async function() {
  const results = await vacancyTest({
    pattern: 'users/:id',
    trigger: el => $(el, 'b').each(b => $(b).vac('users/a')),
    el: '<div><b></b><b></b><b></b></div>',
  });
  assert.deepEqual(results, [{ id: 'a' }]);
});

makeTest('Catch both an attribute mutation and a node addition', async function() {
  const results = await vacancyTest({
    pattern: 'users/:id',
    trigger: el => $(el).vac('users/x').find('i').vac('users/a').append('<b data-vacancy="users/b"></b>'),
    el: '<div><i></i></div>',
  });
  assert.deepEqual(results, [{ id: 'x' }, { id: 'a' }, { id: 'b' }]);
});

makeTest('publish initial vacancies on descendants', async function() {
  const results = await vacancyTest({
    pattern: 'users/:id',
    el: '<i><br data-vacancy="users/bar"/><br data-vacancy="users/baz"/></i>',
  });
  assert.deepEqual(results, [{ id: 'bar' }, { id: 'baz' }]);
});

makeTest('publish initial vacancies on root', async function() {
  const results = await vacancyTest({
    pattern: 'users/:id',
    el: '<i data-vacancy="users/bar"><br/><br/></i>',
  });
  assert.deepEqual(results, [{ id: 'bar' }]);
});

makeTest('publish initial vacancies on root and descendants', async function() {
  const results = await vacancyTest({
    pattern: 'users/:id',
    el: '<i data-vacancy="users/foo"><br data-vacancy="users/bar"/><br data-vacancy="users/baz"/></i>',
  });
  assert.deepEqual(results, [{ id: 'foo' }, { id: 'bar' }, { id: 'baz' }]);
});

// ----------------------------------------

function defaultHandler(params, send) {
  send(params);
}

function vacancyTest({
  pattern,
  handler = defaultHandler,
  connectOpts,
  trigger = () => {},
  el,
}) {
  return new Promise(resolve => {
    el = $(el).get();
    const vacancies = motel();
    const output = [];
    vacancies.listen(pattern, handler);
    vacancies.subscribe(arg => output.push(arg));
    vacancies.connect(el, connectOpts);
    trigger(el);
    wait(100).then(() => {
      vacancies.disconnect();
      resolve(output);
    });
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
