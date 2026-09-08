import { useState } from 'react';
import { Label, SettingsGroup, SettingsRow } from '../../../design-system';
import { settingsCopy as c } from '../../../content/settings';
import { subscriptionCopy } from '../../../content/subscription';
import { Reveal } from '../../../motion/Reveal';
import { useRuntime } from '../../../runtime/AppRuntimeProvider';
import { entitlementStore as useEntitlementStore } from '../../../state/entitlementStore';

export function SubscriptionSection() {
  const runtime = useRuntime();
  const entitlement = useEntitlementStore((state) => state.data.entitlement);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const restore = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await runtime.subscription.restore();
      setNote(result.status === 'trial' || result.status === 'active' ? c.restored : c.noRestore);
    } catch {
      setNote(c.error);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <SettingsGroup title={c.subscription}>
        <SettingsRow
          title={c.plan(entitlement.status)}
          value={entitlement.renewsAt ? c.renewal(entitlement.renewsAt) : undefined}
          icon="star"
        />
        <SettingsRow title={c.manage} icon="star" onPress={() => setNote(c.external)} />
        <SettingsRow
          title={c.restore}
          value={busy ? subscriptionCopy.restoring : undefined}
          icon="arrow"
          onPress={() => void restore()}
        />
      </SettingsGroup>
      {note ? (
        <Reveal key={note}>
          <Label accessibilityRole="alert">{note}</Label>
        </Reveal>
      ) : null}
    </>
  );
}
