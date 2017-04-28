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

    describe('watch', () => {

      it('accepts pattern and handler', () => {
        const m = motel();
        const pattern = /foo/;
        const handler = () => {};
        m.watch(pattern, handler);
      });

      it('requires regex pattern', () => {
        const m = motel();
        const pattern = 'foo';
        const handler = () => {};
        assert.throws(() => m.watch(pattern, handler), /regex/);
      });

      it('requires function handler', () => {
        const m = motel();
        const pattern = /foo/;
        const handler = 'sdf';
        assert.throws(() => m.watch(pattern, handler), /function/);
      });
    });

    describe('subscribe', () => {

      it('accepts a function', () => {
        const m = motel();
        const sub = () => {};
        m.subscribe(sub);
      });

      it('requires a function', () => {
        const m = motel();
        const sub = 'asd';
        assert.throws(() => m.subscribe(sub), /function/);
      });
    });

    describe('send', () => {

      it('accepts a string', () => {
        const m = motel();
        const dataVacancy = 'sdfsdf';
        return m.send(dataVacancy);
      });

      it('requires a string', () => {
        const m = motel();
        const dataVacancy = 3;
        return m.send(dataVacancy)
          .then(() => Promise.reject('missing execption'))
          .catch(err => assert.ok(err.message.includes('string')));
      });

      it('returns a promise', () => {
        const m = motel();
        const dataVacancy = 'sdfsdf';
        const prom = m.send(dataVacancy);
        assert.strictEqual(typeof prom.then, 'function');
      });
    });

    it('sends on match', async function() {
      const m = motel();
      const spy = sinon.spy();
      m.watch(/foo/, spy);
      await m.send('foo');
      assert.strictEqual(spy.callCount, 1);
    });

    it('does not send on no match', async function() {
      const m = motel();
      const spy = sinon.spy();
      m.watch(/foo/, spy);
      await m.send('bar');
      assert.strictEqual(spy.callCount, 0);
    });

    it('dedupes simultaneous', async function() {
      const m = motel();
      const spy = sinon.spy();
      m.watch(/foo/, spy);
      await Promise.all([m.send('foo'), m.send('foo')]);
      assert.strictEqual(spy.callCount, 1);
    });

    it('does not dedupe non-simultaneous', async function() {
      const m = motel();
      const spy = sinon.spy();
      m.watch(/foo/, spy);
      await m.send('foo');
      await m.send('foo');
      assert.strictEqual(spy.callCount, 2);
    });

    it('passes a match array', async function() {
      const m = motel();
      const spy = sinon.spy();
      m.watch(/fo(o)/, spy);
      await m.send('foo');
      const [arg1] = spy.args[0];
      assert.deepEqual(arg1, ['foo', 'o']);
    });

    it('notifies subscribers', async function() {
      const m = motel();
      const spy = sinon.spy();
      m.watch(/fo(o)/, (mat, dispatch) => dispatch(123));
      m.subscribe(spy);
      await m.send('foo');
      const [arg1] = spy.args[0];
      assert.deepEqual(arg1, 123);
    });

    it('notifies multiple subscribers', async function() {
      const m = motel();
      const spy = sinon.spy();
      m.watch(/fo(o)/, (mat, dispatch) => dispatch(123));
      m.subscribe(spy);
      m.subscribe(spy);
      await m.send('foo');
      const [arg1] = spy.args[1];
      assert.deepEqual(arg1, 123);
    });

    it('recovers from watch handler sync error', () => {
      const m = motel();
      m.watch(/foo/, () => {
        throw new Error('fake');
      });
      return m.send('foo');
    });

    it('recovers from watch handler async error', () => {
      const m = motel();
      m.watch(/foo/, () => Promise.reject(new Error('fake')));
      return m.send('foo');
    });

    it('recovers from subscribe handler sync error', () => {
      const m = motel();
      m.watch(/foo/, (mat, dispatch) => dispatch('abc'));
      m.subscribe(() => {
        throw new Error('fake');
      });
      return m.send('foo');
    });

    it('recovers from subscribe handler async error', () => {
      const m = motel();
      m.watch(/foo/, (mat, dispatch) => dispatch('abc'));
      m.subscribe(() => Promise.reject(new Error('fake')));
      return m.send('foo');
    });

    it('subscribe handler sync error wont halt notifications', async function() {
      const m = motel();
      const spy = sinon.spy(() => { throw new Error('fake'); });
      m.watch(/foo/, (mat, dispatch) => dispatch('abc'));
      m.subscribe(spy);
      m.subscribe(spy);
      await m.send('foo');
      assert.strictEqual(spy.callCount, 2);
    });
  });
});
