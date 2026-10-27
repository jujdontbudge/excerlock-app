import { useState } from 'react';
import { SettingsPage } from '../ui/SettingsPage';
import { BottomSheet, Heading, Label, PrimaryButton, SecondaryButton, SettingsGroup, SettingsRow } from '../ui';
import { notify } from '../ui/Notice';
import { AccountScreen } from './AccountScreen';
import { LegalScreen } from './LegalScreen';
import { FeedbackScreen } from '../support/FeedbackScreen';
import { useRuntime } from '../ports/useRuntime';
import { restorePurchases } from '../subscription/restorePurchases';
import { subscriptionCopy } from '../subscription/subscriptionCopy';
import { settingsCopy as c } from './lib/settingsCopy';
import { buildExportPayload } from './lib/exportPayload';

export function RecoveryScreen({
  onBack,
  onSignIn,
  onRestored,
}: {
  onBack: () => void;
  onSignIn: () => void;
  onRestored: () => void;
}) {
  const runtime = useRuntime();
  const [section, setSection] = useState<'menu' | 'account' | 'feedback' | 'terms' | 'privacy'>('menu');
  const [exportOpen, setExportOpen] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const [restoreBusy, setRestoreBusy] = useState(false);
  const back = () => setSection('menu');
  const manage = async () => {
    try {
      await runtime.subscription.manageSubscription();
    } catch {
      notify(subscriptionCopy.manageFallback);
    }
  };
  const restore = async () => {
    if (restoreBusy) return;
    setRestoreBusy(true);
    try {
      if ((await restorePurchases(runtime.subscription)) === 'restored') onRestored();
      else notify(c.noRestore);
    } catch {
      notify(c.error);
    } finally {
      setRestoreBusy(false);
    }
  };
  const exportData = async () => {
    if (exportBusy) return;
    setExportBusy(true);
    try {
      await runtime.dataExport.requestShare(() => buildExportPayload(runtime.clock.now()));
      setExportOpen(false);
    } catch {
      notify(c.error);
    } finally {
      setExportBusy(false);
    }
  };
  if (section === 'account') return <AccountScreen onBack={back} onSave={onSignIn} />;
  if (section === 'feedback') return <FeedbackScreen onBack={back} />;
  if (section === 'terms' || section === 'privacy')
    return <SettingsPage onBack={back}><LegalScreen doc={section} /></SettingsPage>;
  return (
    <SettingsPage
      onBack={onBack}
      overlay={
        <BottomSheet open={exportOpen} title={c.exportTitle} onDismiss={() => !exportBusy && setExportOpen(false)}>
          <Label tone="secondary">{c.exportConsent}</Label>
          <PrimaryButton label={c.exportConfirm} loading={exportBusy} onPress={() => void exportData()} />
          <SecondaryButton label={c.close} loading={exportBusy} onPress={() => setExportOpen(false)} />
        </BottomSheet>
      }>
      <Heading title="Account and help" support="Your account and purchase recovery remain available without a subscription." />
      <SettingsGroup>
        <SettingsRow title="Account and deletion" onPress={() => setSection('account')} />
        <SettingsRow title="Manage subscription in App Store" onPress={() => void manage()} />
        <SettingsRow title={c.exportData} onPress={() => setExportOpen(true)} />
        <SettingsRow title={c.restore} onPress={() => void restore()} />
        <SettingsRow title="Help and feedback" onPress={() => setSection('feedback')} />
        <SettingsRow title="Terms of use" onPress={() => setSection('terms')} />
        <SettingsRow title="Privacy policy" onPress={() => setSection('privacy')} />
      </SettingsGroup>
    </SettingsPage>
  );
}
