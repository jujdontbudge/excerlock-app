import { useState } from 'react';
import { Heading, Label, SettingsGroup, SettingsRow } from '../ui';
import { settingsCopy as c } from './lib/settingsCopy';
import { subscriptionCopy } from '../subscription/subscriptionCopy';
import { entitlementStore as useEntitlementStore } from '../subscription/entitlementStore';
import { useRuntime } from '../ports/useRuntime';
import { Reveal } from '../ui/Reveal';
import { SettingsPage } from '../ui/SettingsPage';
export function SubscriptionScreen({ onBack }: { onBack: () => void }) {
  const entitlement = useEntitlementStore((s) => s.data.entitlement),
    runtime = useRuntime(),
    [busy, setBusy] = useState(false),
    [note, setNote] = useState('');
  const restore = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await runtime.subscription.restore();
      setNote(['trial', 'active'].includes(result.status) ? c.restored : c.noRestore);
    } catch {
      setNote(c.error);
    } finally {
      setBusy(false);
    }
  };
  const manage = async () => {
    try {
      const action = (runtime.subscription as typeof runtime.subscription & {
        manageSubscription?: () => Promise<void>;
      }).manageSubscription;
      if (!action) throw new Error('Subscription management unavailable');
      await action.call(runtime.subscription);
    } catch {
      setNote(subscriptionCopy.manageFallback);
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
        <SettingsRow
          title={c.restore}
          value={busy ? subscriptionCopy.restoring : undefined}
          onPress={() => void restore()}
        />
      </SettingsGroup>
      {note ? (
        <Reveal key={note}>
          <Label accessibilityRole="alert">{note}</Label>
        </Reveal>
      ) : null}
    </SettingsPage>
  );
}
