import { useState } from 'react';
import { BottomSheet, Heading, Label, PrimaryButton, SecondaryButton } from '../../design-system';
import { settingsCopy as c } from '../../content/settings';
import { teardownIdentity } from '../../domain/identity';
import { LivingIcon } from '../../motion/LivingIcon';
import { Reveal } from '../../motion/Reveal';
import { useRuntime } from '../../runtime/AppRuntimeProvider';
import { sessionStore as useSessionStore } from '../../state/sessionStore';
import { SettingsPage } from './SettingsPage';

type ConfirmationMode = 'signOut' | 'delete' | 'deleteData';

function confirmationCopy(mode: ConfirmationMode) {
  if (mode === 'signOut')
    return { title: c.signOutTitle, facts: c.signOutFacts, confirm: c.signOutConfirm, cancel: c.staySignedIn };
  if (mode === 'deleteData')
    return {
      title: c.deleteDataTitle,
      facts: c.deleteDataFacts,
      confirm: c.deleteDataConfirm,
      cancel: c.keepAccount,
    };
  return { title: c.deleteTitle, facts: c.deleteFacts, confirm: c.deleteConfirm, cancel: c.keepAccount };
}

export function AccountScreen({ onSignIn, onBack }: { onSignIn: () => void; onBack: () => void }) {
  const session = useSessionStore((s) => s.data.session);
  const runtime = useRuntime();
  const [mode, setMode] = useState<ConfirmationMode | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const sheet = confirmationCopy(mode ?? 'delete');

  // Every account exit runs through `teardownIdentity` so the SDK release order is the one the
  // domain owns: subscription first, then analytics, and the auth provider last.
  const confirm = async () => {
    if (!mode || busy) return;
    setBusy(true);
    try {
      if (mode === 'signOut') {
        await teardownIdentity(runtime, runtime.auth.signOut);
        setNote(c.signedOutNote);
      } else {
        await teardownIdentity(runtime, runtime.auth.deleteAccount);
        setNote(mode === 'deleteData' ? c.dataDeleted : c.deleted);
      }
      setMode(null);
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
          open={mode !== null}
          title={sheet.title}
          onDismiss={() => {
            if (!busy) setMode(null);
          }}>
          {sheet.facts.map((fact, index) => (
            <Reveal key={fact} index={index}>
              <Label>{fact}</Label>
            </Reveal>
          ))}
          <PrimaryButton label={sheet.confirm} loading={busy} onPress={() => void confirm()} />
          <SecondaryButton label={sheet.cancel} disabled={busy} onPress={() => setMode(null)} />
        </BottomSheet>
      }>
      <Heading title={c.account} support={session.kind === 'anonymous' ? c.anonymous : c.signedIn(session.provider)} />
      <LivingIcon name="person" />
      {note ? (
        <Reveal>
          <Label>{note}</Label>
        </Reveal>
      ) : null}
      <Reveal key={session.kind}>
        {session.kind === 'anonymous' ? (
          <>
            <Label tone="secondary">{c.accountBenefit}</Label>
            <PrimaryButton label={c.signIn} onPress={onSignIn} />
            <SecondaryButton label={c.deleteData} onPress={() => setMode('deleteData')} />
          </>
        ) : (
          <>
            <SecondaryButton label={c.signOut} disabled={busy} onPress={() => setMode('signOut')} />
            <SecondaryButton label={c.delete} disabled={busy} onPress={() => setMode('delete')} />
          </>
        )}
      </Reveal>
    </SettingsPage>
  );
}
