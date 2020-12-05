/**
 * Useful to ensure that a condition is completely
 * ruled out by the type system.
 * */
export default function assertNever(nope: never): never {
  throw new Error(`value ${nope} found unexpectedly`);
}
