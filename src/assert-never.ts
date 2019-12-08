export default function assertNever(nope: never): never {
  throw new Error(`value ${nope} found unexpectedly`);
}
