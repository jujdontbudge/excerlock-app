import { SettingsPage } from '../ui/SettingsPage';
import { useState } from 'react';
import { Heading, Label, PrimaryButton, SecondaryButton, BottomSheet } from '../ui';
import { settingsCopy as c } from './lib/settingsCopy';
import { sessionStore as useSessionStore } from '../identity/sessionStore';
import { useRuntime } from '../ports/useRuntime';
import { LivingIcon } from '../ui/LivingIcon';
import { forgetAccount } from '../journey/index';
import { Reveal } from '../ui/Reveal';
import { notify } from '../ui/Notice';
import { haptic } from '../ui/haptics';
export function AccountScreen({ onSignIn, onBack }: { onSignIn: () => void; onBack: () => void }) {
  const session = useSessionStore((s) => s.data.session),
    runtime = useRuntime(),
    [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false);
  const action = async (deleting: boolean) => {
    setBusy(true);
    try {
      if (deleting) {
        await runtime.auth.deleteAccount();
        notify(c.deleted);
      } else await runtime.auth.signOut();
      forgetAccount();
      setConfirm(false);
      haptic('commit');
    } catch {
      notify(c.error);
      haptic('error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <SettingsPage
      onBack={onBack}
      overlay={
        <BottomSheet
          open={confirm}
          title={c.deleteTitle}
          onDismiss={() => {
            if (!busy) setConfirm(false);
          }}>
          {c.deleteFacts.map((fact, i) => (
            <Reveal key={fact} index={i}>
              <Label>{fact}</Label>
            </Reveal>
          ))}
          <PrimaryButton label={c.deleteConfirm} loading={busy} onPress={() => void action(true)} />
          <SecondaryButton label={c.keepAccount} loading={busy} onPress={() => setConfirm(false)} />
        </BottomSheet>
      }>
      <Heading title={c.account} support={session.kind === 'anonymous' ? c.anonymous : c.signedIn(session.provider)} />
      <LivingIcon name="person" />
      <Reveal key={session.kind === 'anonymous' ? 'anonymous' : 'signedIn'}>
        {session.kind === 'anonymous' ? (
          <>
            <PrimaryButton label={c.signIn} onPress={onSignIn} />
            <SecondaryButton label={c.delete} loading={busy} onPress={() => setConfirm(true)} />
          </>
        ) : (
          <>
            <SecondaryButton label={c.signOut} loading={busy} onPress={() => void action(false)} />
            <SecondaryButton label={c.delete} onPress={() => setConfirm(true)} />
          </>
        )}
      </Reveal>
    </SettingsPage>
  );
}
