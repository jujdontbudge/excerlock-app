import { SettingsPage } from './SettingsPage';
import { useState } from 'react';
import { Heading, Label, PrimaryButton, SecondaryButton, BottomSheet } from '../../design-system';
import { settingsCopy as c } from '../../content/settings';
import { sessionStore as useSessionStore } from '../../state/sessionStore';
import { useRuntime } from '../../runtime/AppRuntimeProvider';
import { LivingIcon } from '../../motion/LivingIcon';
import { Reveal } from '../../motion/Reveal';
import { teardownIdentity } from '../../domain/identity';
export function AccountScreen({ onSignIn, onBack }: { onSignIn: () => void; onBack: () => void }) {
  const session = useSessionStore((s) => s.data.session),
    runtime = useRuntime(),
    [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false),
    [note, setNote] = useState('');
  const action = async (deleting: boolean) => {
    setBusy(true);
    try {
      await teardownIdentity(runtime, deleting ? runtime.auth.deleteAccount : runtime.auth.signOut);
      if (deleting) setNote(c.deleted);
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
          <PrimaryButton label={c.signIn} onPress={onSignIn} />
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
