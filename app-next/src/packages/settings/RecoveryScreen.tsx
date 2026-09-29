import { useState } from 'react';
import { SettingsPage } from '../ui/SettingsPage';
import { Heading, Label, SettingsGroup, SettingsRow } from '../ui';
import { AccountScreen } from './AccountScreen';
import { LegalScreen } from './LegalScreen';
import { FeedbackScreen } from '../support/FeedbackScreen';
import { useRuntime } from '../ports/useRuntime';
import { useLaunchSignIn } from '../identity/launchSignInGate';

export function RecoveryScreen({ onBack, onSignIn }: { onBack: () => void; onSignIn: () => void }) {
  const runtime = useRuntime();
  const approved = useLaunchSignIn(runtime.auth);
  const [section, setSection] = useState<'menu' | 'account' | 'feedback' | 'terms' | 'privacy'>('menu');
  const back = () => setSection('menu');
  if (section === 'account' && (approved || runtime.auth.session().kind === 'anonymous'))
    return <AccountScreen onBack={back} onSignIn={onSignIn} />;
  if (section === 'feedback') return <FeedbackScreen onBack={back} />;
  if (section === 'terms' || section === 'privacy')
    return <SettingsPage onBack={back}><LegalScreen doc={section} /></SettingsPage>;
  return (
    <SettingsPage onBack={onBack}>
      <Heading title="Account and help" support="Your account and purchase recovery remain available without a subscription." />
      <SettingsGroup>
        {approved || runtime.auth.session().kind === 'anonymous' ? (
          <SettingsRow title="Account and deletion" onPress={() => setSection('account')} />
        ) : (
          <SettingsRow title="Sign in to manage your account" onPress={onSignIn} />
        )}
        <SettingsRow title="Manage subscription in App Store" onPress={() => void runtime.subscription.manageSubscription()} />
        <SettingsRow title="Help and feedback" onPress={() => setSection('feedback')} />
        <SettingsRow title="Terms of use" onPress={() => setSection('terms')} />
        <SettingsRow title="Privacy policy" onPress={() => setSection('privacy')} />
      </SettingsGroup>
      <Label tone="secondary">Restore purchases is available on the Paywall.</Label>
    </SettingsPage>
  );
}
