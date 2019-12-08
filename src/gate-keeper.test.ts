import { GateKeeper } from './gate-keeper';
import { ok } from 'assert';

describe('GateKeeper', () => {
  it('constructs', () => {
    return new GateKeeper();
  });
  it('returns promise on first incr', () => {
    const tracker = new GateKeeper();
    const isEnter = tracker.incr('foo');
    ok(isEnter?.then);
  });
  it('returns no promise on second incr', () => {
    const tracker = new GateKeeper();
    tracker.incr('foo');
    const isEnter = tracker.incr('foo');
    ok(!(isEnter?.then));
  });
  it('promise is resolved after incr/decr', async() => {
    const tracker = new GateKeeper();
    const isEnter = tracker.incr('foo');
    tracker.decr('foo');
    const result = await Promise.race([isEnter, xAfter(3)]);
    ok(result === undefined);
  });
  it('promise is not resolved after not incr/incr/decr', async() => {
    const tracker = new GateKeeper();
    const isEnter = tracker.incr('foo');
    tracker.incr('foo');
    tracker.decr('foo');
    const result = await Promise.race([isEnter, xAfter(3)]);
    ok(result === 'x');
  });
  it('promise is resolved after not incr/incr/decr/decr', async() => {
    const tracker = new GateKeeper();
    const isEnter = tracker.incr('foo');
    tracker.incr('foo');
    tracker.decr('foo');
    tracker.decr('foo');
    const result = await Promise.race([isEnter, xAfter(3)]);
    ok(result === undefined);
  });
  it('tracks complex changes', async() => {
    const tracker = new GateKeeper();
    const isEnter = tracker.incr('foo');
    ok(!tracker.incr('foo'));
    tracker.decr('foo');
    ok(!tracker.incr('foo'));
    tracker.decr('foo');
    tracker.decr('foo');
    const result = await Promise.race([isEnter, xAfter(3)]);
    ok(result === undefined);
  });
  // it('no enter on second incr', () => {
  //   const tracker = new GateKeeper();
  //   tracker.incr('foo');
  //   const isEnter = tracker.incr('foo');
  //   ok(!isEnter);
  // });
  // it('no exit on decr with no prev incr', () => {
  //   const tracker = new GateKeeper();
  //   const isExit = tracker.decr('foo');
  //   ok(!isExit);
  // });
  // it('exit on decr with prev incr', () => {
  //   const tracker = new GateKeeper();
  //   const results = [
  //     tracker.incr('foo'),
  //     tracker.decr('foo'),
  //   ];
  //   deepStrictEqual(results, [
  //     true,
  //     true,
  //   ]);
  // });
  // it('no exit on decr with 2 prev incr', () => {
  //   const tracker = new GateKeeper();
  //   const results = [
  //     tracker.incr('foo'),
  //     tracker.incr('foo'),
  //     tracker.decr('foo'),
  //   ];
  //   deepStrictEqual(results, [
  //     true,
  //     false,
  //     false,
  //   ]);
  // });
  // it('exit on 2 decr with 2 prev incr', () => {
  //   const tracker = new GateKeeper();
  //   const results = [
  //     tracker.incr('foo'),
  //     tracker.incr('foo'),
  //     tracker.decr('foo'),
  //     tracker.decr('foo'),
  //   ];
  //   deepStrictEqual(results, [
  //     true,
  //     false,
  //     false,
  //     true,
  //   ]);
  // });
  // it('handles multiple values', () => {
  //   const tracker = new GateKeeper();
  //   const results = [
  //     tracker.incr('foo'),
  //     tracker.incr('bar'),
  //     tracker.incr('bar'),
  //     tracker.incr('foo'),
  //     tracker.decr('foo'),
  //     tracker.decr('bar'),
  //     tracker.decr('foo'),
  //     tracker.decr('bar'),
  //   ];
  //   deepStrictEqual(results, [
  //     true,
  //     true,
  //     false,
  //     false,
  //     false,
  //     false,
  //     true,
  //     true,
  //   ]);
  // });
});

function xAfter(t: number): Promise<'x'> {
  return new Promise(res => {
    setTimeout(() => {
      res('x');
    }, t);
  });
}
