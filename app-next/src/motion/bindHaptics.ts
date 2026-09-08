import { settingsStore } from '../state/settingsStore';
import { setHapticsEnabled } from './haptics';
import { Unsubscribe } from '../ports/models';
/**
 * Binds the Touch feedback preference to the haptics module for the life of the app, so a
 * rehydrated `haptics: false` silences feedback before the first screen renders.
 */
export function bindHaptics(store = settingsStore): Unsubscribe {
  const apply = () => setHapticsEnabled(store.getState().data.haptics);
  apply();
  return store.subscribe(apply);
}
