import Telemetry from './telemetry';
import sinon from 'sinon';
import { ok, strictEqual } from 'assert';

describe('Telemetry', () => {
  it('constructs', () => {
    return new Telemetry('debug', () => {});
  });
  it('handles debug', () => {
    const spy = sinon.spy();
    const tel = new Telemetry('debug', spy);
    tel.send('debug', 'hello');
    tel.send('warn', 'hello');
    tel.send('error', 'hello');
    tel.send('critical', 'hello');
    ok(spy.callCount === 4);
  });
  it('handles warn', () => {
    const spy = sinon.spy();
    const tel = new Telemetry('warn', spy);
    tel.send('debug', 'hello');
    tel.send('warn', 'hello');
    tel.send('error', 'hello');
    tel.send('critical', 'hello');
    ok(spy.callCount === 3);
  });
  it('handles error', () => {
    const spy = sinon.spy();
    const tel = new Telemetry('error', spy);
    tel.send('debug', 'hello');
    tel.send('warn', 'hello');
    tel.send('error', 'hello');
    tel.send('critical', 'hello');
    ok(spy.callCount === 2);
  });
  it('handles critical', () => {
    const spy = sinon.spy();
    const tel = new Telemetry('critical', spy);
    tel.send('debug', 'hello');
    tel.send('warn', 'hello');
    tel.send('error', 'hello');
    tel.send('critical', 'hello');
    ok(spy.callCount === 1);
  });
  it('receives non-error message', () => {
    const spy = sinon.spy();
    const tel = new Telemetry('debug', spy);
    tel.send('debug', 'hello');
    const [isError, message] = spy.firstCall.args;
    ok(!isError, 'is error');
    strictEqual(message, 'Motel debug: hello');
  });
  it('receives error message', () => {
    const spy = sinon.spy();
    const tel = new Telemetry('critical', spy);
    tel.send('critical', 'hello');
    const [isError, message] = spy.firstCall.args;
    ok(isError, 'not error');
    strictEqual(message, 'Motel critical: hello');
  });
});
