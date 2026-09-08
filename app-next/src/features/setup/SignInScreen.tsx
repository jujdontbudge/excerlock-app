import { useState } from 'react';
import { View } from 'react-native';
import { Heading, Label, TextField, PrimaryButton, SecondaryButton } from '../../design-system';
import { setupCopy as c } from '../../content/setup';
import { tokens as t } from '../../design-system/tokens';
import { LivingIcon } from '../../motion/LivingIcon';
import { Reveal } from '../../motion/Reveal';
import { useRuntime } from '../../runtime/AppRuntimeProvider';
import { sessionStore as useSessionStore } from '../../state/sessionStore';
import { EmailCodeScreen } from './EmailCodeScreen';
import { Session } from '../../domain/types';
import { requestFailureMessage } from '../../runtime/requestFailureMessage';
import { common } from '../../content/common';
export function SignInScreen({ onContinue }: { onContinue: (session: Session) => void }) {
  const runtime = useRuntime(),
    session = useSessionStore((s) => s.data.session),
    [phase, setPhase] = useState<'options' | 'email' | 'code'>('options'),
    [email, setEmail] = useState(''),
    [code, setCode] = useState(''),
    [error, setError] = useState(''),
    [note, setNote] = useState(''),
    [busy, setBusy] = useState(false);
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const signIn = async (provider: 'apple' | 'google' | 'email') => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const result =
        provider === 'apple'
          ? await runtime.auth.signInWithApple()
          : provider === 'google'
            ? await runtime.auth.signInWithGoogle()
            : await runtime.auth.verifyEmailCode(code);
      if (result.kind === 'signedIn') onContinue(result);
      else setError(c.cancelled);
    } catch {
      setError(
        await requestFailureMessage(runtime.reachability, {
          offline: common.offline,
          fallback: provider === 'email' ? c.codeError : c.authError,
        }),
      );
    } finally {
      setBusy(false);
    }
  };
  const send = async () => {
    if (busy || !validEmail) return;
    setBusy(true);
    setError('');
    try {
      await runtime.auth.sendEmailCode(email.trim());
      if (phase === 'code') setNote(c.resent);
      setPhase('code');
    } catch {
      setError(await requestFailureMessage(runtime.reachability, { offline: common.offline, fallback: c.authError }));
    } finally {
      setBusy(false);
    }
  };
  if (session.kind === 'signedIn')
    return (
      <>
        <Heading title={c.X4} support={c.authBody} />
        <LivingIcon name="check" />
        <Label>{session.email}</Label>
        <PrimaryButton label={c.continue} onPress={() => onContinue(session)} />
      </>
    );
  return (
    <Reveal key={phase} style={{ flexGrow: 1, gap: t.space.xl }}>
      {phase === 'code' ? (
        <EmailCodeScreen
          code={code}
          onCode={setCode}
          onVerify={() => signIn('email')}
          onResend={send}
          busy={busy}
          error={error}
          note={note}
        />
      ) : (
        <>
          <Heading title={phase === 'email' ? c.emailTitle : c.X4} support={c.authBody} />
          <LivingIcon name="person" />
          <Label variant="support" tone="secondary">
            {c.restoreNote}
          </Label>
          {phase === 'email' ? (
            <>
              <TextField
                label={c.emailLabel}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                autoFocus
                error={email && !validEmail ? c.emailError : undefined}
              />
              <PrimaryButton label={c.sendCode} disabled={!validEmail} loading={busy} onPress={send} />
            </>
          ) : (
            <>
              <PrimaryButton label={c.apple} loading={busy} onPress={() => signIn('apple')} />
              <SecondaryButton label={c.google} disabled={busy} onPress={() => signIn('google')} />
              <SecondaryButton
                label={c.email}
                disabled={busy}
                onPress={() => {
                  setPhase('email');
                  setError('');
                }}
              />
            </>
          )}
          {error ? (
            <Reveal>
              <Label style={{ color: t.state.error }}>{error}</Label>
            </Reveal>
          ) : null}
        </>
      )}
      <View style={{ flexGrow: 1 }} />
      {phase !== 'options' ? (
        <SecondaryButton
          label={c.back}
          disabled={busy}
          variant="tertiary"
          onPress={() => {
            setPhase('options');
            setError('');
          }}
        />
      ) : null}
      <SecondaryButton label={c.skip} disabled={busy} variant="tertiary" onPress={() => onContinue(session)} />
    </Reveal>
  );
}
