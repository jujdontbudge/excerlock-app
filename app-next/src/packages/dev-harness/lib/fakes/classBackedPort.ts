export function classBackedPort<T extends object>(name: string, port: T): T {
  const methods = new Map<PropertyKey, unknown>();
  const strict: T = new Proxy(port, {
    get(target, key) {
      const value: unknown = Reflect.get(target, key);
      if (typeof value !== 'function') return value;
      if (!methods.has(key)) {
        methods.set(key, function (this: unknown, ...args: unknown[]) {
          if (this !== strict)
            throw new TypeError(
              `${name}.${String(key)} was called detached from its port. On a device this port is a class, so the call crashes the app. Wrap it: (...args) => ${name}.${String(key)}(...args).`,
            );
          return (value as (...a: unknown[]) => unknown).apply(target, args);
        });
      }
      return methods.get(key);
    },
  });
  return strict;
}
