/* eslint-env mocha */

const motel = require('.');
const assert = require('assert');
const sinon = require('sinon');

describe('motel', () => {

  describe('factory', () => {

    it('exists', () => {
      assert.ok(motel);
    });

    it('is a funciton', () => {
      assert.strictEqual(typeof motel, 'function');
    });
  });

  describe('instance', () => {

    describe('add', () => {

      it('accepts regex and handler', () => {
        const m = motel();
        const pattern = /foo/;
        const handler = () => {};
        m.add(pattern, handler);
      });

      it('accepts string and handler', () => {
        const m = motel();
        const pattern = 'foo:bar';
        const handler = () => {};
        m.add(pattern, handler);
      });
    });

    describe('subscribe', () => {

      it('accepts a function', () => {
        const m = motel();
        const sub = () => {};
        m.subscribe(sub);
      });
    });

    describe('publish', () => {

      it('accepts a string', () => {
        const m = motel();
        const dataVacancy = 'sdfsdf';
        return m.publish(dataVacancy);
      });

      it('returns a promise', () => {
        const m = motel();
        const dataVacancy = 'sdfsdf';
        const prom = m.publish(dataVacancy);
        assert.strictEqual(typeof prom.then, 'function');
      });
    });

    it('publishes on match', async function() {
      const m = motel();
      const spy = sinon.spy();
      m.add(/foo/, spy);
      await m.publish('foo');
      assert.strictEqual(spy.callCount, 1);
    });

    it('does not publish on no match', async function() {
      const m = motel();
      const spy = sinon.spy();
      m.add(/foo/, spy);
      await m.publish('bar');
      assert.strictEqual(spy.callCount, 0);
    });

    it('dedupes simultaneous', async function() {
      const m = motel();
      const spy = sinon.spy();
      m.add(/foo/, spy);
      await Promise.all([m.publish('foo'), m.publish('foo')]);
      assert.strictEqual(spy.callCount, 1);
    });

    it('does not dedupe non-simultaneous', async function() {
      const m = motel();
      const spy = sinon.spy();
      m.add(/foo/, spy);
      await m.publish('foo');
      await m.publish('foo');
      assert.strictEqual(spy.callCount, 2);
    });

    it('passes a match array for regex', async function() {
      const m = motel();
      const spy = sinon.spy();
      m.add(/fo(o)/, spy);
      await m.publish('foo');
      const [arg1] = spy.args[0];
      assert.strictEqual(arg1[0], 'foo');
      assert.strictEqual(arg1[1], 'o');
    });

    it('passes a match object for string pattern', async function() {
      const m = motel();
      const spy = sinon.spy();
      m.add('users[:id]', spy);
      await m.publish('users[abc]');
      const [arg1] = spy.args[0];
      assert.strictEqual(arg1.id, 'abc');
    });

    it('notifies subscribers', async function() {
      const m = motel();
      const spy = sinon.spy();
      m.add(/fo(o)/, (mat, dispatch) => dispatch(123));
      m.subscribe(spy);
      await m.publish('foo');
      const [arg1] = spy.args[0];
      assert.deepEqual(arg1, 123);
    });

    it('notifies multiple subscribers', async function() {
      const m = motel();
      const spy = sinon.spy();
      m.add(/fo(o)/, (mat, dispatch) => dispatch(123));
      m.subscribe(spy);
      m.subscribe(spy);
      await m.publish('foo');
      const [arg1] = spy.args[1];
      assert.deepEqual(arg1, 123);
    });

    it('recovers from vacancy handler sync error', () => {
      const m = motel();
      m.add(/foo/, () => {
        throw new Error('fake');
      });
      return m.publish('foo');
    });

    it('recovers from vacancy handler async error', () => {
      const m = motel();
      m.add(/foo/, () => Promise.reject(new Error('fake')));
      return m.publish('foo');
    });

    it('recovers from subscribe handler sync error', () => {
      const m = motel();
      m.add(/foo/, (mat, dispatch) => dispatch('abc'));
      m.subscribe(() => {
        throw new Error('fake');
      });
      return m.publish('foo');
    });

    it('recovers from subscribe handler async error', () => {
      const m = motel();
      m.add(/foo/, (mat, dispatch) => dispatch('abc'));
      m.subscribe(() => Promise.reject(new Error('fake')));
      return m.publish('foo');
    });

    it('subscribe handler sync error wont halt notifications', async function() {
      const m = motel();
      const spy = sinon.spy(() => { throw new Error('fake'); });
      m.add(/foo/, (mat, dispatch) => dispatch('abc'));
      m.subscribe(spy);
      m.subscribe(spy);
      await m.publish('foo');
      assert.strictEqual(spy.callCount, 2);
    });
  });
});
