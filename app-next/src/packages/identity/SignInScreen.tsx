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
import { AuthError, isAuthCancelled, isAuthRateLimited } from '../ports/AuthPort';
import type { SaveAccountResult } from '../ports/AuthPort';
import { haptic } from '../ui/haptics';
import { expectedSignInFailure, signInFailureClass } from './lib/signInFailure';
import { currentEmailChallenge, forgetEmailChallenge } from './emailChallenge';

export { signInRecoveryCopy } from './lib/signInCopy';

export type SignInPurpose = 'save' | 'signIn';
type Provider = 'apple' | 'google' | 'email';

export function SignInScreen({
  purpose,
  reportError,
  onContinue,
  onExit,
}: {
  purpose: SignInPurpose;
  reportError: (error: unknown) => void;
  onContinue: () => void | Promise<void>;
  onExit?: () => void;
}) {
  const runtime = useRuntime(),
    session = useSessionStore((s) => s.data.session),
    initialChallenge = currentEmailChallenge(runtime.auth.identity().userId),
    submitting = useRef(false),
    [phase, setPhase] = useState<'options' | 'email' | 'code' | 'existing'>(initialChallenge ? 'code' : 'options'),
    [email, setEmail] = useState(initialChallenge?.email ?? ''),
    [code, setCode] = useState(''),
    [busy, setBusy] = useState(false),
    [cooldownUntil, setCooldownUntil] = useState(initialChallenge?.resendAt ?? 0),
    [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (cooldownUntil <= now) return;
    const tick = setTimeout(() => setNow(Date.now()), 1000);
    return () => clearTimeout(tick);
  }, [cooldownUntil, now]);
  const cooldown = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const words = c[purpose];
  const title = words.title;
  const support = words.body;
  const failed = (provider: Provider, caught: unknown) => {
    const reason = signInFailureClass(caught);
    runtime.analytics.track('sign_in_failed', {
      provider,
      surface: purpose === 'save' ? 'sign_up' : 'sign_in',
      reason_class: reason,
      ...(caught instanceof AuthError ? { failure_code: caught.code.slice(0, 60) } : {}),
    });
    if (!expectedSignInFailure(reason)) reportError(caught);
  };
  const run = async (provider: Provider, action: () => Promise<void>) => {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    try {
      await action();
    } catch (caught) {
      if (isAuthCancelled(caught)) return;
      failed(provider, caught);
      haptic('error');
      if (provider === 'email') setCode('');
      notify(provider === 'email' && phase === 'code' ? c.codeError : provider === 'apple' ? c.appleError : c.authError);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };
  const finish = async () => {
    haptic('success');
    if (purpose === 'save') notify(c.saved);
    await onContinue();
  };
  const switchAccount = async () => {
    const result = await runtime.auth.useExistingAccount();
    if (result === 'code-sent') {
      setCode('');
      setCooldownUntil(Date.now() + 60_000);
      setNow(Date.now());
      setPhase('code');
      return;
    }
    await finish();
  };
  const existing = async () => {
    haptic('warning');
    if (purpose === 'signIn') await switchAccount();
    else setPhase('existing');
  };
  const save = (provider: 'apple' | 'google') => run(provider, async () => {
    const result: SaveAccountResult = provider === 'apple' ? await runtime.auth.saveWithApple() : await runtime.auth.saveWithGoogle();
    if (result === 'cancelled') return;
    if (result === 'existing-account') await existing();
    else await finish();
  });
  const confirm = (typed = code) => run('email', async () => {
    const result = await runtime.auth.confirmEmailCode(typed);
    if (result.kind !== 'signedIn') throw new AuthError('Email code finished without a saved account.', { code: 'IDENTITY_NOT_READY' });
    await finish();
  });
  const send = () => {
    if (!validEmail || cooldown > 0) return Promise.resolve();
    return run('email', async () => {
      try {
        const result = await runtime.auth.sendEmailCode(email.trim());
        if (result === 'existing-account') {
          await existing();
          return;
        }
        setCooldownUntil(Date.now() + 60_000);
        setNow(Date.now());
        setCode('');
        if (phase === 'code') notify(c.resent);
        setPhase('code');
      } catch (caught) {
        if (!isAuthRateLimited(caught)) throw caught;
        failed('email', caught);
        setCooldownUntil(Date.now() + caught.retryAfterSeconds * 1000);
        setNow(Date.now());
        setPhase('code');
        notify(c.alreadySent);
      }
    });
  };
  if (purpose === 'save' && session.kind === 'signedIn' && phase === 'options')
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
            if (value.length === 6 && value !== code) void confirm(value);
          }}
          onVerify={() => void confirm()}
          onResend={() => void send()}
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
      ) : phase === 'existing' ? (
        <>
          <View style={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', gap: t.space.md }}>
            <LivingIcon name="check" />
            <Heading title={c.existingTitle} centered />
            <Label tone="secondary" style={{ textAlign: 'center' }}>
              {c.existingBody}
            </Label>
          </View>
          <View style={{ gap: t.space.md }}>
            <PrimaryButton label={c.useExisting} loading={busy} onPress={() => void run('email', switchAccount)} />
            <SecondaryButton label={c.keepGuest} variant="tertiary" onPress={() => setPhase('options')} />
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
              <PrimaryButton label={c.sendCode} disabled={!validEmail} loading={busy} onPress={() => void send()} />
            </>
          ) : (
            <View style={{ gap: t.space.md }}>
              <SecondaryButton
                label={c.apple}
                loading={busy}
                leading={<SymbolView name="apple.logo" size={t.icon.md} tintColor={t.text.primary} />}
                onPress={() => void save('apple')}
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
                onPress={() => void save('google')}
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
      {phase === 'existing' ? null : <SecondaryButton label={c.skip} loading={busy} variant="tertiary" onPress={onContinue} />}
    </Reveal>
  );
}
