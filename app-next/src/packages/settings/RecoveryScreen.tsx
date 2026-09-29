import { useState } from 'react';
import { SettingsPage } from '../ui/SettingsPage';
import { BottomSheet, Heading, Label, PrimaryButton, SecondaryButton, SettingsGroup, SettingsRow } from '../ui';
import { AccountScreen } from './AccountScreen';
import { LegalScreen } from './LegalScreen';
import { FeedbackScreen } from '../support/FeedbackScreen';
import { useRuntime } from '../ports/useRuntime';
import { useLaunchSignIn } from '../identity/launchSignInGate';
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
  const approved = useLaunchSignIn(runtime.auth);
  const [section, setSection] = useState<'menu' | 'account' | 'feedback' | 'terms' | 'privacy'>('menu');
  const [exportOpen, setExportOpen] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const [restoreBusy, setRestoreBusy] = useState(false);
  const [note, setNote] = useState('');
  const back = () => setSection('menu');
  const manage = async () => {
    setNote('');
    try {
      await runtime.subscription.manageSubscription();
    } catch {
      setNote(subscriptionCopy.manageFallback);
    }
  };
  const restore = async () => {
    if (restoreBusy) return;
    setRestoreBusy(true);
    setNote('');
    try {
      if ((await restorePurchases(runtime.subscription, runtime.analytics)) === 'restored') onRestored();
      else setNote(c.noRestore);
    } catch {
      setNote(c.error);
    } finally {
      setRestoreBusy(false);
    }
  };
  const exportData = async () => {
    if (exportBusy) return;
    setExportBusy(true);
    setNote('');
    try {
      await runtime.dataExport.requestShare(() => buildExportPayload(runtime.clock.now()));
      setNote(c.exportReady);
      setExportOpen(false);
    } catch {
      setNote(c.exportError);
    } finally {
      setExportBusy(false);
    }
  };
  if (section === 'account' && (approved || runtime.auth.session().kind === 'anonymous'))
    return <AccountScreen onBack={back} onSignIn={onSignIn} />;
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
          <SecondaryButton label={c.close} disabled={exportBusy} onPress={() => setExportOpen(false)} />
        </BottomSheet>
      }>
      <Heading title="Account and help" support="Your account and purchase recovery remain available without a subscription." />
      <SettingsGroup>
        {approved || runtime.auth.session().kind === 'anonymous' ? (
          <SettingsRow title="Account and deletion" onPress={() => setSection('account')} />
        ) : (
          <SettingsRow title="Sign in to manage your account" onPress={onSignIn} />
        )}
        <SettingsRow title="Manage subscription in App Store" onPress={() => void manage()} />
        <SettingsRow title={c.exportData} onPress={() => setExportOpen(true)} />
        <SettingsRow
          title={c.restore}
          value={restoreBusy ? subscriptionCopy.restoring : undefined}
          onPress={() => void restore()}
        />
        <SettingsRow title="Help and feedback" onPress={() => setSection('feedback')} />
        <SettingsRow title="Terms of use" onPress={() => setSection('terms')} />
        <SettingsRow title="Privacy policy" onPress={() => setSection('privacy')} />
      </SettingsGroup>
      {note ? <Label accessibilityRole="alert">{note}</Label> : null}
    </SettingsPage>
  );
}
