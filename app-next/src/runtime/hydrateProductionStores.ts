import { stores } from '../state/stores';
import { detectionStore } from '../state/detectionStore';

type HydratableStore = {
  persist: { rehydrate(): Promise<void> | void; hasHydrated(): boolean; getOptions(): { name?: string } };
};

/** Zustand reports read/parse failures through hydration state, not rejection.
 * Native policy and identity construction must wait until ALL stores succeeded.
 * Keep detection out of the demo reset list: its single writer owns durable reset.
 */
export async function hydrateProductionStores(owned: readonly HydratableStore[] = [...stores, detectionStore]): Promise<void> {
  const results = await Promise.allSettled(owned.map(async store => {
    await store.persist.rehydrate();
    if (!store.persist.hasHydrated()) throw new Error(`Store hydration failed: ${store.persist.getOptions().name}`);
  }));
  const failed = results.find((result): result is PromiseRejectedResult => result.status === 'rejected');
  if (failed) throw failed.reason;
}
