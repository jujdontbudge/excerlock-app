import { useEffect, useState } from 'react';
import { Image, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { BackButton, Heading, Label, TextField, PrimaryButton, SecondaryButton } from '../ui';
import { signInCopy as c } from './lib/signInCopy';
import { tokens as t } from '../ui/tokens';
import { LivingIcon } from '../ui/LivingIcon';
import { Reveal } from '../ui/Reveal';
import { notify } from '../ui/Notice';
import { useRuntime } from '../ports/useRuntime';
import { sessionStore as useSessionStore } from './sessionStore';
import { EmailCodeScreen } from './lib/EmailCodeScreen';
import { AuthError, isAuthCancelled, isAuthRecoveryRequired } from '../ports/AuthPort';
import { resolveSignInRequired, type SignInRequiredSource } from './lib/signInRequired';
import { rememberSignIn } from './rememberedSignIn';
import { haptic } from '../ui/haptics';
import { expectedSignInFailure, signInFailureClass } from './lib/signInFailure';

export type SignInPurpose = 'signUp' | 'signIn';

export function SignInScreen({
  purpose,
  reportError,
  onContinue,
  signInRequired,
  onExit,
  requireFreshSignIn = false,
}: {
  purpose: SignInPurpose;
  reportError: (error: unknown) => void;
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
    [busy, setBusy] = useState(false),
    [required, setRequired] = useState<boolean | null>(
      signInRequired === undefined ? false : typeof signInRequired === 'boolean' ? signInRequired : null,
    ),
    [flagAttempt, setFlagAttempt] = useState(0),
    [recoveryProvider, setRecoveryProvider] = useState<'apple' | 'google' | 'email' | null>(null);
  useEffect(() => {
    let active = true,
      retry: ReturnType<typeof setTimeout> | undefined;
    void Promise.resolve(resolveSignInRequired(signInRequired, false))
      .then((value) => {
        if (active) setRequired(value);
      })
      .catch(() => {
        if (active) {
          setRequired(null);
          retry = setTimeout(() => setFlagAttempt((value) => value + 1), t.motion.hold.notice);
        }
      });
    return () => {
      active = false;
      if (retry) clearTimeout(retry);
    };
  }, [flagAttempt, signInRequired]);
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const words = c[purpose];
  const title = words.title;
  const support = purpose === 'signIn' && requireFreshSignIn && session.kind === 'signedIn' ? c.returningBody : words.body;
  const failed = (provider: 'apple' | 'google' | 'email', caught: unknown) => {
    const reason = signInFailureClass(caught);
    runtime.analytics.track('sign_in_failed', {
      provider,
      surface: purpose === 'signUp' ? 'sign_up' : 'sign_in',
      reason_class: reason,
    });
    if (!expectedSignInFailure(reason)) reportError(caught);
  };
  const signIn = async (provider: 'apple' | 'google' | 'email') => {
    if (busy) return;
    setBusy(true);
    setRecoveryProvider(null);
    try {
      const result =
        provider === 'apple'
          ? await runtime.auth.signInWithApple()
          : provider === 'google'
            ? await runtime.auth.signInWithGoogle()
            : await runtime.auth.verifyEmailCode(code);
      if (result.kind === 'signedIn' && rememberSignIn(runtime.auth.identity())) {
        haptic('success');
        onContinue();
      } else {
        haptic('error');
        notify(c.authError);
        failed(provider, new AuthError('Sign-in finished without an approved account.', { code: 'IDENTITY_NOT_READY' }));
      }
    } catch (caught) {
      if (isAuthCancelled(caught)) return;
      if (!(isAuthRecoveryRequired(caught) && caught.provider === 'email')) failed(provider, caught);
      if (isAuthRecoveryRequired(caught)) {
        haptic('warning');
        if (caught.provider === 'email') {
          setPhase('code');
          notify(c.codeSent);
        } else {
          setRecoveryProvider(caught.provider);
          notify(c.accountInUse);
        }
      } else if (caught instanceof AuthError && caught.code === 'REAUTH_DIFFERENT_ACCOUNT') {
        setRecoveryProvider(provider);
        notify(c.sameAccount);
      } else {
        haptic('error');
        if (provider === 'email') setCode('');
        notify(provider === 'email' ? c.codeError : c.authError);
      }
    } finally {
      setBusy(false);
    }
  };
  const send = async () => {
    if (busy || !validEmail) return;
    setBusy(true);
    setRecoveryProvider(null);
    try {
      await runtime.auth.sendEmailCode(email.trim());
      setCode('');
      if (phase === 'code') notify(c.resent);
      setPhase('code');
    } catch (caught) {
      if (isAuthRecoveryRequired(caught) && caught.provider === 'email') {
        setPhase('code');
        notify(c.codeSent);
      } else {
        haptic('error');
        notify(c.authError);
        failed('email', caught);
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
        <View style={{ alignItems: 'flex-start', marginBottom: -t.space.lg }}>
          <BackButton
            label={phase === 'options' ? undefined : c.backToOptions}
            onPress={() => {
              if (busy) return;
              if (phase === 'options') onExit?.();
              else setPhase('options');
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
          body={words.codeBody}
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
              <Heading title={words.emailTitle} centered />
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
              />
              <PrimaryButton label={c.sendCode} disabled={!validEmail} loading={busy} onPress={send} />
            </>
          ) : (
            <View style={{ gap: t.space.md }}>
              <SecondaryButton
                label={c.apple}
                loading={busy}
                leading={<SymbolView name="apple.logo" size={t.icon.md} tintColor={t.text.primary} />}
                onPress={() => void signIn('apple')}
              />
              <SecondaryButton
                label={c.google}
                loading={busy}
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
              <PrimaryButton label={c.email} loading={busy} onPress={() => setPhase('email')} />
            </View>
          )}
          {recoveryProvider ? (
            <SecondaryButton
              label={recoveryProvider === 'email' ? 'Switch to this email account' : `Recover with ${recoveryProvider === 'apple' ? 'Apple' : 'Google'}`}
              loading={busy}
              onPress={() => {
                setBusy(true);
                const recovery = recoveryProvider === 'apple'
                  ? runtime.auth.recoverWithApple()
                  : recoveryProvider === 'google'
                    ? runtime.auth.recoverWithGoogle()
                    : runtime.auth.recoverWithEmailCode(code);
                void recovery
                  .then((result) => {
                    if (result.kind === 'signedIn' && rememberSignIn(runtime.auth.identity())) onContinue();
                    else notify(c.authError);
                  })
                  .catch((caught) => {
                    if (isAuthCancelled(caught)) return;
                    notify(c.authError);
                    failed(recoveryProvider, caught);
                  })
                  .finally(() => setBusy(false));
              }}
            />
          ) : null}
        </>
      )}
      <View style={{ flexGrow: 1 }} />
      {required === false ? (
        <SecondaryButton label={c.skip} loading={busy} variant="tertiary" onPress={onContinue} />
      ) : null}
    </Reveal>
  );
}
