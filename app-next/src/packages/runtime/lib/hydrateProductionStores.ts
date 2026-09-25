import { stores } from '../../launch/stores';
import { detectionStore } from '../../activity/detectionStore';

type HydratableStore = {
  persist: { rehydrate(): Promise<void> | void; hasHydrated(): boolean; getOptions(): { name?: string } };
};

export async function hydrateProductionStores(owned: readonly HydratableStore[] = [...stores, detectionStore]): Promise<void> {
  const results = await Promise.allSettled(owned.map(async store => {
    await store.persist.rehydrate();
    if (!store.persist.hasHydrated()) throw new Error(`Store hydration failed: ${store.persist.getOptions().name}`);
  }));
  const failed = results.find((result): result is PromiseRejectedResult => result.status === 'rejected');
  if (failed) throw failed.reason;
}
