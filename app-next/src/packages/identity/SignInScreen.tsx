import { useEffect, useState } from 'react';
import { View } from 'react-native';
import {
  AppleAuthenticationButton,
  AppleAuthenticationButtonStyle,
  AppleAuthenticationButtonType,
} from 'expo-apple-authentication';
import { BackButton, Heading, Label, TextField, PrimaryButton, SecondaryButton } from '../ui';
import { signInCopy as c } from './lib/signInCopy';
import { tokens as t } from '../ui/tokens';
import { LivingIcon } from '../ui/LivingIcon';
import { Reveal } from '../ui/Reveal';
import { useRuntime } from '../ports/useRuntime';
import { sessionStore as useSessionStore } from './sessionStore';
import { EmailCodeScreen } from './lib/EmailCodeScreen';
import { isAuthCancelled, isAuthRecoveryRequired } from '../ports/AuthPort';
import { resolveSignInRequired, type SignInRequiredSource } from './lib/signInRequired';

export function SignInScreen({
  onContinue,
  signInRequired,
}: {
  onContinue: () => void;
  signInRequired?: SignInRequiredSource;
}) {
  const runtime = useRuntime(),
    session = useSessionStore((s) => s.data.session),
    [phase, setPhase] = useState<'options' | 'email' | 'code'>('options'),
    [email, setEmail] = useState(''),
    [code, setCode] = useState(''),
    [error, setError] = useState(''),
    [note, setNote] = useState(''),
    [busy, setBusy] = useState(false),
    [required, setRequired] = useState<boolean | null>(
      signInRequired === undefined ? false : typeof signInRequired === 'boolean' ? signInRequired : null,
    ),
    [flagError, setFlagError] = useState(false),
    [flagAttempt, setFlagAttempt] = useState(0),
    [recoveryProvider, setRecoveryProvider] = useState<'apple' | 'google' | null>(null);
  useEffect(() => {
    let active = true;
    void Promise.resolve(resolveSignInRequired(signInRequired, false))
      .then((value) => {
        if (active) {
          setFlagError(false);
          setRequired(value);
        }
      })
      .catch(() => {
        if (active) {
          setRequired(null);
          setFlagError(true);
        }
      });
    return () => {
      active = false;
    };
  }, [flagAttempt, signInRequired]);
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const signIn = async (provider: 'apple' | 'google' | 'email') => {
    if (busy) return;
    setBusy(true);
    setError('');
    setRecoveryProvider(null);
    try {
      const result =
        provider === 'apple'
          ? await runtime.auth.signInWithApple()
          : provider === 'google'
            ? await runtime.auth.signInWithGoogle()
            : await runtime.auth.verifyEmailCode(code);
      if (result.kind === 'signedIn') onContinue();
      else setError(c.cancelled);
    } catch (caught) {
      if (isAuthCancelled(caught)) {
        setError(c.cancelled);
      } else if (isAuthRecoveryRequired(caught)) {
        if (caught.provider === 'email') {
          setPhase('code');
          setError(caught.message);
        } else {
          setRecoveryProvider(caught.provider);
          setError(caught.message);
        }
      } else {
        setError(provider === 'email' ? c.codeError : c.authError);
      }
    } finally {
      setBusy(false);
    }
  };
  const send = async () => {
    if (busy || !validEmail) return;
    setBusy(true);
    setError('');
    setRecoveryProvider(null);
    try {
      await runtime.auth.sendEmailCode(email.trim());
      if (phase === 'code') setNote(c.resent);
      setPhase('code');
    } catch (caught) {
      if (isAuthRecoveryRequired(caught) && caught.provider === 'email') {
        setPhase('code');
        setError(caught.message);
      } else {
        setError(c.authError);
      }
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
        <PrimaryButton label={c.continue} onPress={onContinue} />
      </>
    );
  return (
    <Reveal key={phase} style={{ flexGrow: 1, gap: t.space.xl }}>
      {phase !== 'options' ? (
        <View style={{ marginLeft: -(t.control.inline - t.icon.md) / 2, marginBottom: -t.space.lg }}>
          <BackButton
            label={c.backToOptions}
            disabled={busy}
            onPress={() => {
              setPhase('options');
              setError('');
            }}
          />
        </View>
      ) : null}
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
          {phase === 'email' ? (
            <>
              <TextField
                label={c.emailLabel}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                maxLength={254}
                returnKeyType="send"
                onSubmitEditing={() => void send()}
                autoFocus
                error={email && !validEmail ? c.emailError : undefined}
              />
              <PrimaryButton label={c.sendCode} disabled={!validEmail} loading={busy} onPress={send} />
            </>
          ) : (
            <>
              <AppleAuthenticationButton
                buttonType={AppleAuthenticationButtonType.CONTINUE}
                buttonStyle={AppleAuthenticationButtonStyle.WHITE_OUTLINE}
                cornerRadius={t.radius.pill}
                style={{ width: '100%', height: t.control.full }}
                accessible
                accessibilityRole="button"
                accessibilityLabel={c.apple}
                accessibilityState={{ disabled: busy, busy }}
                onPress={() => {
                  if (!busy) void signIn('apple');
                }}
                onAccessibilityTap={() => {
                  if (!busy) void signIn('apple');
                }}
              />
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
              <Label accessibilityRole="alert" style={{ color: t.state.error }}>
                {error}
              </Label>
            </Reveal>
          ) : null}
          {recoveryProvider ? (
            <SecondaryButton
              label={`Recover with ${recoveryProvider === 'apple' ? 'Apple' : 'Google'}`}
              disabled={busy}
              onPress={() => {
                setBusy(true);
                setError('');
                const recovery =
                  recoveryProvider === 'apple' ? runtime.auth.recoverWithApple() : runtime.auth.recoverWithGoogle();
                void recovery
                  .then((result) => {
                    if (result.kind === 'signedIn') onContinue();
                    else setError(c.authError);
                  })
                  .catch((caught) => setError(isAuthCancelled(caught) ? c.cancelled : c.authError))
                  .finally(() => setBusy(false));
              }}
            />
          ) : null}
          {flagError ? (
            <>
              <Label accessibilityRole="alert" style={{ color: t.state.error }}>
                Sign-in requirements could not load. Please retry.
              </Label>
              <SecondaryButton
                label="Retry sign-in requirements"
                onPress={() => {
                  setFlagError(false);
                  setRequired(null);
                  setFlagAttempt((value) => value + 1);
                }}
              />
            </>
          ) : null}
        </>
      )}
      <View style={{ flexGrow: 1 }} />
      {required === false ? (
        <SecondaryButton label={c.skip} disabled={busy} variant="tertiary" onPress={onContinue} />
      ) : null}
    </Reveal>
  );
}
