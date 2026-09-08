import type { AdaptyProfile } from 'react-native-adapty';
import { Entitlement } from '../../domain/types';
import { mergeRestoredEntitlement } from '../../domain/mergeRestoredEntitlement';
import { AdaptyFlowView } from './adaptySdk';

export type PresentationDeps = {
  current: () => Entitlement;
  publish: (next: Entitlement) => Entitlement;
  fromProfile: (profile: AdaptyProfile) => Entitlement;
};

/**
 * Turns the Builder view's event stream into the single entitlement the caller is waiting for.
 *
 * A handler's return value decides whether the view closes, so the rule is: close on anything that
 * settles the purchase, stay open on anything the user can still act on. A dismissal that settles
 * nothing resolves with the unchanged entitlement, which is what re-presents the hard paywall.
 */
export function awaitFlowOutcome(view: AdaptyFlowView, deps: PresentationDeps) {
  let settle: (value: Entitlement) => void = () => undefined;
  let fail: (cause: unknown) => void = () => undefined;
  let done = false;
  const outcome = new Promise<Entitlement>((resolve, reject) => {
    settle = resolve;
    fail = reject;
  });
  const finish = (act: () => void) => {
    if (done) return;
    done = true;
    act();
  };
  const stop = view.setEventHandlers({
    onPurchaseCompleted: (result) => {
      // The user backed out of the App Store sheet but is still looking at the paywall.
      if (result.type === 'user_cancelled') return false;
      if (result.type === 'success') {
        const next = deps.publish(deps.fromProfile(result.profile));
        finish(() => settle(next));
        return true;
      }
      // Pending (Ask to Buy): nothing is owned yet, and there is nothing more to do here.
      finish(() => settle(deps.current()));
      return true;
    },
    onRestoreCompleted: (profile) => {
      const current = deps.current();
      const merged = mergeRestoredEntitlement(current, deps.fromProfile(profile));
      // Nothing was restored: never downgrade, and leave the paywall up with its own message.
      if (merged === current) return false;
      deps.publish(merged);
      finish(() => settle(merged));
      return true;
    },
    onCloseButtonPress: () => {
      finish(() => settle(deps.current()));
      return true;
    },
    onDisappeared: () => {
      finish(() => settle(deps.current()));
      return false;
    },
    onError: (error) => {
      finish(() => fail(error));
      return true;
    },
    onLoadingProductsFailed: (error) => {
      finish(() => fail(error));
      return true;
    },
  });
  return { outcome, stop };
}
