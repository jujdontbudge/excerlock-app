import { restorePurchases } from '../subscription/restorePurchases';
import { useState } from 'react';
import { Heading, SettingsGroup, SettingsRow } from '../ui';
import { notify } from '../ui/Notice';
import { settingsCopy as c } from './lib/settingsCopy';
import { subscriptionCopy } from '../subscription/subscriptionCopy';
import { entitlementStore as useEntitlementStore } from '../subscription/entitlementStore';
import { useRuntime } from '../ports/useRuntime';
import { SettingsPage } from '../ui/SettingsPage';
export function SubscriptionScreen({ onBack }: { onBack: () => void }) {
  const entitlement = useEntitlementStore((s) => s.data.entitlement),
    runtime = useRuntime(),
    [busy, setBusy] = useState(false);
  const restore = async () => {
    if (busy) return;
    setBusy(true);
    try {
      notify((await restorePurchases(runtime.subscription, runtime.analytics)) === 'restored' ? c.restored : c.noRestore);
    } catch {
      notify(c.error);
    } finally {
      setBusy(false);
    }
  };
  const manage = async () => {
    try {
      await runtime.subscription.manageSubscription();
    } catch {
      notify(subscriptionCopy.manageFallback);
    }
  };
  return (
    <SettingsPage onBack={onBack}>
      <Heading title={c.subscription} support={subscriptionCopy.billingSupport} />
      <SettingsGroup>
        <SettingsRow
          title={c.plan(entitlement.status)}
          value={entitlement.renewsAt ? c.renewal(entitlement.renewsAt) : undefined}
        />
        <SettingsRow title={subscriptionCopy.manage} onPress={() => void manage()} />
        <SettingsRow title={c.restore} onPress={() => void restore()} />
      </SettingsGroup>
    </SettingsPage>
  );
}
