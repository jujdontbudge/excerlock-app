import { useEffect, useRef, useState } from 'react';
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
import { AuthError, isAuthCancelled, isAuthNoAccount, isAuthRateLimited, isAuthRecoveryRequired } from '../ports/AuthPort';
import { resolveSignInRequired, type SignInRequiredSource } from './lib/signInRequired';
import { rememberSignIn } from './rememberedSignIn';
import { haptic } from '../ui/haptics';
import { expectedSignInFailure, signInFailureClass } from './lib/signInFailure';
import { currentEmailChallenge, forgetEmailChallenge } from './emailChallenge';

export { signInRecoveryCopy } from './lib/signInCopy';

export type SignInPurpose = 'signUp' | 'signIn';

export function SignInScreen({
  purpose,
  reportError,
  onContinue,
  signInRequired,
  onExit,
  requireFreshSignIn = false,
  onCreateAccount,
  firstVisit = false,
}: {
  purpose: SignInPurpose;
  reportError: (error: unknown) => void;
  onContinue: () => void;
  signInRequired?: SignInRequiredSource;
  onExit?: () => void;
  requireFreshSignIn?: boolean;
  onCreateAccount?: () => void;
  firstVisit?: boolean;
}) {
  const runtime = useRuntime(),
    session = useSessionStore((s) => s.data.session),
    initialChallenge = currentEmailChallenge(runtime.auth.identity().userId),
    submitting = useRef(false),
    [phase, setPhase] = useState<'options' | 'email' | 'code' | 'noAccount'>(initialChallenge ? 'code' : 'options'),
    [email, setEmail] = useState(initialChallenge?.email ?? ''),
    [code, setCode] = useState(''),
    [busy, setBusy] = useState(false),
    [required, setRequired] = useState<boolean | null>(
      signInRequired === undefined ? false : typeof signInRequired === 'boolean' ? signInRequired : null,
    ),
    [flagAttempt, setFlagAttempt] = useState(0),
    [cooldownUntil, setCooldownUntil] = useState(initialChallenge?.resendAt ?? 0),
    [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (cooldownUntil <= now) return;
    const tick = setTimeout(() => setNow(Date.now()), 1000);
    return () => clearTimeout(tick);
  }, [cooldownUntil, now]);
  const cooldown = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));
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
  const support = purpose === 'signIn' && requireFreshSignIn && !firstVisit && session.kind === 'signedIn' ? c.returningBody : words.body;
  const failed = (provider: 'apple' | 'google' | 'email', caught: unknown) => {
    const reason = signInFailureClass(caught);
    runtime.analytics.track('sign_in_failed', {
      provider,
      surface: purpose === 'signUp' ? 'sign_up' : 'sign_in',
      reason_class: reason,
      ...(caught instanceof AuthError ? { failure_code: caught.code.slice(0, 60) } : {}),
    });
    if (!expectedSignInFailure(reason)) reportError(caught);
  };
  const signIn = async (provider: 'apple' | 'google' | 'email', typed = code) => {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    try {
      const result =
        provider === 'apple'
          ? await runtime.auth.signInWithApple()
          : provider === 'google'
            ? await runtime.auth.signInWithGoogle()
            : await runtime.auth.verifyEmailCode(typed);
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
          notify(c.accountInUse);
        }
      } else {
        haptic('error');
        if (provider === 'email') setCode('');
        notify(provider === 'email' ? c.codeError : provider === 'apple' ? c.appleError : c.authError);
      }
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };
  const send = async () => {
    if (submitting.current || !validEmail || cooldown > 0) return;
    submitting.current = true;
    setBusy(true);
    try {
      await runtime.auth.sendEmailCode(email.trim());
      setCooldownUntil(Date.now() + 60_000);
      setNow(Date.now());
      setCode('');
      if (phase === 'code') notify(c.resent);
      setPhase('code');
    } catch (caught) {
      if (isAuthRecoveryRequired(caught) && caught.provider === 'email') {
        setPhase('code');
        notify(c.codeSent);
      } else if (isAuthNoAccount(caught)) {
        haptic('warning');
        failed('email', caught);
        setPhase('noAccount');
      } else if (isAuthRateLimited(caught)) {
        failed('email', caught);
        setCooldownUntil(Date.now() + caught.retryAfterSeconds * 1000);
        setNow(Date.now());
        setPhase('code');
        notify(c.alreadySent);
      } else {
        haptic('error');
        notify(c.authError);
        failed('email', caught);
      }
    } finally {
      submitting.current = false;
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
              if (submitting.current) return;
              void forgetEmailChallenge();
              if (phase === 'options') onExit?.();
              else setPhase('options');
            }}
          />
        </View>
      ) : null}
      {phase === 'code' ? (
        <EmailCodeScreen
          code={code}
          email={email.trim()}
          onCode={(value) => {
            setCode(value);
            if (value.length === 6 && value !== code) void signIn('email', value);
          }}
          onVerify={() => signIn('email')}
          onResend={send}
          onChangeEmail={() => {
            if (submitting.current) return;
            setCode('');
            setCooldownUntil(0);
            void forgetEmailChallenge();
            setPhase('email');
          }}
          busy={busy}
          resendIn={cooldown}
        />
      ) : phase === 'noAccount' ? (
        <>
          <View style={{ alignItems: 'center', gap: t.space.md }}>
            <LivingIcon name="mail" />
            <Heading title={c.noAccountTitle} centered />
            <Label tone="secondary" style={{ textAlign: 'center' }}>
              {c.noAccountBody(email.trim())}
            </Label>
          </View>
          <View style={{ gap: t.space.md }}>
            <PrimaryButton label={c.tryAnotherEmail} onPress={() => setPhase('email')} />
            <SecondaryButton label={c.otherWays} onPress={() => setPhase('options')} />
            {onCreateAccount ? <SecondaryButton label={c.createAccount} variant="tertiary" onPress={onCreateAccount} /> : null}
          </View>
        </>
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
        </>
      )}
      <View style={{ flexGrow: 1 }} />
      {required === false ? (
        <SecondaryButton label={c.skip} loading={busy} variant="tertiary" onPress={onContinue} />
      ) : null}
    </Reveal>
  );
}
