import { useState } from 'react';
import { Linking } from 'react-native';
import { Label, SettingsGroup, SettingsRow } from '../../../design-system';
import { settingsCopy as c } from '../../../content/settings';
import { subscriptionCopy } from '../../../content/subscription';
import { MANAGE_SUBSCRIPTIONS_URL } from '../../../adapters/appStore/links';
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
  // Subscriptions are managed in the App Store only; the app never cancels or changes one itself.
  const manage = async () => {
    try {
      await Linking.openURL(MANAGE_SUBSCRIPTIONS_URL);
    } catch {
      setNote(c.error);
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
        <SettingsRow title={c.manage} icon="star" onPress={() => void manage()} />
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
