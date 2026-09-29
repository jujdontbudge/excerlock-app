import { SettingsPage } from '../ui/SettingsPage';
import { useState } from 'react';
import { Heading, Label, PrimaryButton, SecondaryButton, BottomSheet } from '../ui';
import { settingsCopy as c } from './lib/settingsCopy';
import { sessionStore as useSessionStore } from '../identity/sessionStore';
import { useRuntime } from '../ports/useRuntime';
import { LivingIcon } from '../ui/LivingIcon';
import { beginWelcome } from '../journey/index';
import { Reveal } from '../ui/Reveal';
export function AccountScreen({ onSignIn, onBack }: { onSignIn: () => void; onBack: () => void }) {
  const session = useSessionStore((s) => s.data.session),
    runtime = useRuntime(),
    [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false),
    [note, setNote] = useState('');
  const action = async (deleting: boolean) => {
    setBusy(true);
    setNote('');
    try {
      if (deleting) {
        await runtime.auth.deleteAccount();
        setNote(c.deleted);
      } else await runtime.auth.signOut();
      beginWelcome();
      setConfirm(false);
    } catch {
      setNote(c.error);
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
          {note ? <Label accessibilityRole="alert">{note}</Label> : null}
          <PrimaryButton label={c.deleteConfirm} loading={busy} onPress={() => void action(true)} />
          <SecondaryButton label={c.keepAccount} disabled={busy} onPress={() => setConfirm(false)} />
        </BottomSheet>
      }>
      <Heading title={c.account} support={session.kind === 'anonymous' ? c.anonymous : c.signedIn(session.provider)} />
      <LivingIcon name="person" />
      {note ? (
        <Reveal>
          <Label>{note}</Label>
        </Reveal>
      ) : null}
      <Reveal key={session.kind === 'anonymous' ? 'anonymous' : 'signedIn'}>
        {session.kind === 'anonymous' ? (
          <>
            <PrimaryButton label={c.signIn} onPress={onSignIn} />
            <SecondaryButton label={c.delete} disabled={busy} onPress={() => setConfirm(true)} />
          </>
        ) : (
          <>
            <SecondaryButton label={c.signOut} disabled={busy} onPress={() => void action(false)} />
            <SecondaryButton label={c.delete} onPress={() => setConfirm(true)} />
          </>
        )}
      </Reveal>
    </SettingsPage>
  );
}
