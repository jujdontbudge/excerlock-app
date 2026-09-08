import { AppState } from 'react-native';

export type AppStateSource = {
  addEventListener(event: 'change', callback: (state: string) => void): { remove(): void };
};

export type AppStateOwner = AppStateSource & { dispose(): void };

/**
 * The app's one `AppState` subscription, fanned out to the hosts that need a foreground signal.
 *
 * Two hosts need one: the enforcement host re-reads permissions and re-applies the lock on `active`,
 * and the sync host pushes day facts on `background`. They are separate concerns and neither should
 * be a hook of the other, but the app should still hold a single native listener — so this owns it
 * and hands both of them a source that looks exactly like `AppState` itself.
 *
 * A throwing owner does not silence the ones after it: a failure in one host is not a reason for
 * enforcement to miss a foreground transition.
 */
export function createAppStateOwner(source: AppStateSource = AppState): AppStateOwner {
  const owners = new Set<(state: string) => void>();
  let subscription: { remove(): void } | undefined;
  let disposed = false;

  const ensure = () => {
    if (subscription || disposed) return;
    subscription = source.addEventListener('change', (state) => {
      owners.forEach((owner) => {
        try {
          owner(state);
        } catch {
          // Reported by whoever owns the handler; never allowed to drop the next one's signal.
        }
      });
    });
  };

  return {
    addEventListener(_event, callback) {
      owners.add(callback);
      ensure();
      return {
        remove: () => {
          owners.delete(callback);
        },
      };
    },
    dispose() {
      disposed = true;
      owners.clear();
      subscription?.remove();
      subscription = undefined;
    },
  };
}

let shared: AppStateOwner | undefined;

/** The process-wide owner. Both hosts default to it; a test passes its own source instead. */
export function appStateOwner(): AppStateOwner {
  shared ??= createAppStateOwner();
  return shared;
}
