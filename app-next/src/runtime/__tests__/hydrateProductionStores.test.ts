import { hydrateProductionStores } from '../hydrateProductionStores';
const store = (name: string, hydrate: () => Promise<void>, hydrated = true) => ({
  persist: { rehydrate: jest.fn(hydrate), hasHydrated: () => hydrated, getOptions: () => ({ name }) },
});
test('boot waits for every storage hydration before permitting policy construction', async () => {
  let finish!: () => void;
  const slow = store('detection', () => new Promise<void>(resolve => { finish = resolve; }));
  const fast = store('rules', async () => {});
  let ready = false;
  const boot = hydrateProductionStores([slow, fast]).then(() => { ready = true; });
  await Promise.resolve(); await Promise.resolve();
  expect(ready).toBe(false);
  finish(); await boot; expect(ready).toBe(true);
});
test('Zustand swallowed read or JSON failure cannot become successful boot', async () => {
  await expect(hydrateProductionStores([store('detection', async () => {}, false)])).rejects.toThrow('Store hydration failed: detection');
});
test('failure waits for other hydrations to settle before error recovery may reset stores', async () => {
  let finish!: () => void;
  const slow = store('rules', () => new Promise<void>(resolve => { finish = resolve; }));
  let failed = false;
  const boot = hydrateProductionStores([store('detection', async () => { throw new Error('disk'); }), slow]).catch(() => { failed = true; });
  await Promise.resolve(); await Promise.resolve();
  expect(failed).toBe(false);
  finish(); await boot; expect(failed).toBe(true);
});
