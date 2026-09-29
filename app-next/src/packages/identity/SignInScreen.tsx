import { useEffect, useState } from 'react';
import { Image, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { BackButton, Heading, Label, TextField, PrimaryButton, SecondaryButton } from '../ui';
import { signInCopy as c } from './lib/signInCopy';
import { tokens as t } from '../ui/tokens';
import { LivingIcon } from '../ui/LivingIcon';
import { Reveal } from '../ui/Reveal';
import { useRuntime } from '../ports/useRuntime';
import { sessionStore as useSessionStore } from './sessionStore';
import { EmailCodeScreen } from './lib/EmailCodeScreen';
import { AuthError, isAuthCancelled, isAuthRecoveryRequired } from '../ports/AuthPort';
import { resolveSignInRequired, type SignInRequiredSource } from './lib/signInRequired';
import { approveLaunchSignIn } from './launchSignInGate';

export function SignInScreen({
  onContinue,
  signInRequired,
  onExit,
  requireFreshSignIn = false,
}: {
  onContinue: () => void;
  signInRequired?: SignInRequiredSource;
  onExit?: () => void;
  requireFreshSignIn?: boolean;
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
    [recoveryProvider, setRecoveryProvider] = useState<'apple' | 'google' | 'email' | null>(null);
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
  const returning = requireFreshSignIn && session.kind === 'signedIn';
  const title = returning ? c.returningTitle : c.X4;
  const support = returning ? c.returningBody : c.authBody;
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
      if (result.kind === 'signedIn' && approveLaunchSignIn(runtime.auth.identity())) onContinue();
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
      } else if (caught instanceof AuthError && caught.code === 'REAUTH_DIFFERENT_ACCOUNT') {
        setRecoveryProvider(provider);
        setError(caught.message);
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
  if (session.kind === 'signedIn' && !requireFreshSignIn)
    return (
      <>
        <Heading title={title} support={support} />
        <LivingIcon name="check" />
        <Label>{session.email}</Label>
        <PrimaryButton label={c.continue} onPress={onContinue} />
      </>
    );
  return (
    <Reveal key={phase} style={{ flexGrow: 1, gap: t.space.xl }}>
      {phase !== 'options' || onExit ? (
        <View style={{ marginLeft: -(t.control.inline - t.icon.md) / 2, marginBottom: -t.space.lg }}>
          <BackButton
            label={phase === 'options' ? undefined : c.backToOptions}
            disabled={busy}
            onPress={() => {
              if (phase === 'options') onExit?.();
              else {
                setPhase('options');
                setError('');
              }
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
          {phase === 'options' ? (
            <View style={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', gap: t.space.md }}>
              <Reveal>
                <Image
                  source={require('../../../assets/running-lock-primary.png')}
                  resizeMode="contain"
                  accessible={false}
                  style={{ width: t.control.row, height: t.control.row }}
                />
              </Reveal>
              <Heading title={title} centered />
              <Label tone="secondary" style={{ textAlign: 'center' }}>
                {support}
              </Label>
            </View>
          ) : (
            <>
              <Heading title={c.emailTitle} centered />
              <Label tone="secondary" style={{ textAlign: 'center' }}>
                {support}
              </Label>
            </>
          )}
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
            <View style={{ gap: t.space.md }}>
              <SecondaryButton
                label={c.apple}
                disabled={busy}
                leading={<SymbolView name="apple.logo" size={t.icon.md} tintColor={t.text.primary} />}
                onPress={() => void signIn('apple')}
              />
              <SecondaryButton
                label={c.google}
                disabled={busy}
                leading={
                  <Image
                    source={require('../../../assets/google-g.png')}
                    accessible={false}
                    style={{ width: t.icon.md, height: t.icon.md }}
                  />
                }
                onPress={() => void signIn('google')}
              />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.md }}>
                <View style={{ flex: 1, height: t.stroke.hairline, backgroundColor: t.border.divider }} />
                <Label variant="support" tone="secondary">
                  {c.or}
                </Label>
                <View style={{ flex: 1, height: t.stroke.hairline, backgroundColor: t.border.divider }} />
              </View>
              <PrimaryButton
                label={c.email}
                disabled={busy}
                onPress={() => {
                  setPhase('email');
                  setError('');
                }}
              />
            </View>
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
              label={recoveryProvider === 'email' ? 'Switch to this email account' : `Recover with ${recoveryProvider === 'apple' ? 'Apple' : 'Google'}`}
              disabled={busy}
              onPress={() => {
                setBusy(true);
                setError('');
                const recovery = recoveryProvider === 'apple'
                  ? runtime.auth.recoverWithApple()
                  : recoveryProvider === 'google'
                    ? runtime.auth.recoverWithGoogle()
                    : runtime.auth.recoverWithEmailCode(code);
                void recovery
                  .then((result) => {
                    if (result.kind === 'signedIn' && approveLaunchSignIn(runtime.auth.identity())) onContinue();
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
