module.exports = makeTest;

function makeTest(description, cb) {
  const testsEl = document.getElementById('tests');
  const testEl = document.createElement('div');
  const buttonEl = document.createElement('button');
  buttonEl.className = 'run';
  buttonEl.innerHTML = 'run';
  testEl.className = 'test';
  testEl.innerHTML = `<h2>${description}</h2>`;
  testEl.appendChild(buttonEl);
  testsEl.appendChild(testEl);
  buttonEl.addEventListener('click', async function() {
    try {
      await Promise.resolve(cb());
      testEl.className += ' success';
    } catch(ex) {
      testEl.className += ' error';
      const errorEl = document.createElement('pre');
      errorEl.className = 'error';
      const tNode = document.createTextNode(ex.stack);
      errorEl.appendChild(tNode);
      testEl.appendChild(errorEl);
    } finally {
      buttonEl.parentNode.removeChild(buttonEl);
    }
  });
}
