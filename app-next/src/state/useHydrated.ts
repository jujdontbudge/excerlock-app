import { useSyncExternalStore } from 'react';
import { stores } from './stores';
const subscribe = (listener: () => void) => {
  const stops = stores.flatMap((store) => [
    store.persist.onHydrate(listener),
    store.persist.onFinishHydration(listener),
  ]);
  return () => stops.forEach((stop) => stop());
};
const hydrated = () => stores.every((store) => store.persist.hasHydrated());
export function useHydrated() {
  return useSyncExternalStore(subscribe, hydrated, hydrated);
}
