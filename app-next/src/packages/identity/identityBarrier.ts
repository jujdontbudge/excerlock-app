export type RunIdentityOperation = <T>(operation: () => Promise<T>) => Promise<T>;

export function createIdentityBarrier(): RunIdentityOperation {
  let tail: Promise<void> = Promise.resolve();
  return <T>(operation: () => Promise<T>): Promise<T> => {
    const result = tail.then(operation, operation);
    tail = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  };
}
