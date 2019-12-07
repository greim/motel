/* eslint-env mocha */

import motel from '.';
import assert from 'assert';
import sinon from 'sinon';

process.on('unhandledRejection', (ex: any) => {
  if (!ex.isFake) {
    console.error(ex.stack); // eslint-disable-line no-console
    process.exit(1);
  }
});

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

    describe('listen', () => {

      it('accepts regex and handler', () => {
        const m = motel();
        const pattern = /foo/;
        const handler = () => {};
        m.listen(pattern, handler);
      });

      it('accepts string and handler', () => {
        const m = motel();
        const pattern = 'foo:bar';
        const handler = () => {};
        m.listen(pattern, handler);
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
      m.listen(/foo/, spy);
      await m.publish('foo');
      assert.strictEqual(spy.callCount, 1);
    });

    it('does not publish on no match', async function() {
      const m = motel();
      const spy = sinon.spy();
      m.listen(/foo/, spy);
      await m.publish('bar');
      assert.strictEqual(spy.callCount, 0);
    });

    it('dedupes simultaneous', async function() {
      const m = motel();
      const spy = sinon.spy();
      m.listen(/foo/, spy);
      await Promise.all([m.publish('foo'), m.publish('foo')]);
      assert.strictEqual(spy.callCount, 1);
    });

    it('does not dedupe non-simultaneous', async function() {
      const m = motel();
      const spy = sinon.spy();
      m.listen(/foo/, spy);
      await m.publish('foo');
      await m.publish('foo');
      assert.strictEqual(spy.callCount, 2);
    });

    it('passes a match array for regex', async function() {
      const m = motel();
      const spy = sinon.spy();
      m.listen(/fo(o)/, spy);
      await m.publish('foo');
      const [arg1] = spy.args[0];
      assert.strictEqual(arg1[0], 'foo');
      assert.strictEqual(arg1[1], 'o');
    });

    it('passes a match object for string pattern', async function() {
      const m = motel();
      const spy = sinon.spy();
      m.listen('users[:id]', spy);
      await m.publish('users[abc]');
      const [arg1] = spy.args[0];
      assert.strictEqual(arg1.id, 'abc');
    });

    it('notifies subscribers', async function() {
      const m = motel();
      const spy = sinon.spy();
      m.listen(/fo(o)/, (mat: any, send: any) => send(123));
      m.subscribe(spy);
      await m.publish('foo');
      const [arg1] = spy.args[0];
      assert.deepEqual(arg1, 123);
    });

    it('notifies multiple subscribers', async function() {
      const m = motel();
      const spy = sinon.spy();
      m.listen(/fo(o)/, (mat: any, send: any) => send(123));
      m.subscribe(spy);
      m.subscribe(spy);
      await m.publish('foo');
      const [arg1] = spy.args[1];
      assert.deepEqual(arg1, 123);
    });

    it('recovers from vacancy handler sync error', () => {
      const m = motel();
      m.listen(/foo/, () => {
        throw new Error('fake');
      });
      return m.publish('foo');
    });

    it('recovers from vacancy handler async error', () => {
      const m = motel();
      m.listen(/foo/, () => Promise.reject(new Error('fake')));
      return m.publish('foo');
    });

    it('recovers from subscribe handler sync error', () => {
      const m = motel();
      m.listen(/foo/, (mat: any, send: any) => send('abc'));
      m.subscribe(() => {
        throw new Error('fake');
      });
      return m.publish('foo');
    });

    it('recovers from subscribe handler async error', () => {
      const m = motel();
      m.listen(/foo/, (mat: any, send: any) => send('abc'));
      m.subscribe(() => {
        const err: any = new Error('fake');
        err.isFake = true;
        return Promise.reject(err);
      });
      return m.publish('foo');
    });

    it('subscribe handler sync error wont halt notifications', async function() {
      const m = motel();
      const spy = sinon.spy(() => { throw new Error('fake'); });
      m.listen(/foo/, (mat: any, send: any) => send('abc'));
      m.subscribe(spy);
      m.subscribe(spy);
      await m.publish('foo');
      assert.strictEqual(spy.callCount, 2);
    });

    it('subscribe handler async error wont halt notifications', async function() {
      const m = motel();
      const spy = sinon.spy(() => {
        const err: any = new Error('fake');
        err.isFake = true;
        Promise.reject(err);
      });
      m.listen(/foo/, (mat: any, send: any) => send('abc'));
      m.subscribe(spy);
      m.subscribe(spy);
      await m.publish('foo');
      assert.strictEqual(spy.callCount, 2);
    });
  });
});
