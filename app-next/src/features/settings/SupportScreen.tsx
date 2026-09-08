import * as Device from 'expo-device';
import { useState } from 'react';
import { Keyboard } from 'react-native';
import { Heading, Label, PressableScale, PrimaryButton, SegmentedControl, TextField } from '../../design-system';
import { common } from '../../content/common';
import { settingsCopy as c } from '../../content/settings';
import { supportDiagnostics } from '../../domain/supportDiagnostics';
import { Permissions } from '../../domain/types';
import { tokens as t } from '../../design-system/tokens';
import { LivingIcon } from '../../motion/LivingIcon';
import { Reveal } from '../../motion/Reveal';
import { useRuntime } from '../../runtime/AppRuntimeProvider';
import { apiFailureMessage } from '../../adapters/api/failureMessage';
import { entitlementStore as useEntitlementStore } from '../../state/entitlementStore';
import { permissionsStore as usePermissionsStore } from '../../state/permissionsStore';
import { rulesStore as useRulesStore } from '../../state/rulesStore';
import { sessionStore as useSessionStore } from '../../state/sessionStore';
import { SettingsPage } from './SettingsPage';
import { appBuildInfo } from './appBuildInfo';

const validEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

export function SupportScreen({ onBack = () => {} }: { onBack?: () => void }) {
  const runtime = useRuntime();
  const session = useSessionStore((s) => s.data.session);
  const permissions = usePermissionsStore((s) => s.data);
  const entitlement = useEntitlementStore((s) => s.data.entitlement);
  const ruleCount = useRulesStore((s) => s.data.rules.length);
  const [category, setCategory] = useState<'Problem' | 'Question' | 'Idea'>('Problem');
  const [message, setMessage] = useState('');
  const [replyTo, setReplyTo] = useState(session.kind === 'signedIn' ? (session.email ?? '') : '');
  const [replyTouched, setReplyTouched] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(true);
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');
  const lastEnforcement = [...runtime.dev.snapshot().events]
    .reverse()
    .find((event) => event.event === 'lock_applied')?.props.state;
  const build = appBuildInfo({ version: c.unavailable, build: c.unavailable });
  const diagnostics = supportDiagnostics({
    appVersion: build.version,
    appBuild: build.build,
    iosVersion: Device.osVersion ?? c.unavailable,
    deviceModel: Device.modelName ?? c.unavailable,
    entitlementStatus: entitlement.status,
    permissions,
    ruleCount,
    lastEnforcementResult: typeof lastEnforcement === 'string' ? lastEnforcement : c.unavailable,
  });
  const canSend = !!message.trim() && validEmail(replyTo) && state !== 'sending';
  const diagnosticsText = [
    `${c.diagnosticLabels.appVersion}: ${diagnostics.appVersion}`,
    `${c.diagnosticLabels.appBuild}: ${diagnostics.appBuild}`,
    `${c.diagnosticLabels.iosVersion}: ${diagnostics.iosVersion}`,
    `${c.diagnosticLabels.deviceModel}: ${diagnostics.deviceModel}`,
    `${c.diagnosticLabels.entitlementStatus}: ${diagnostics.entitlementStatus}`,
    `${c.diagnosticLabels.ruleCount}: ${diagnostics.ruleCount}`,
    `${c.diagnosticLabels.lastEnforcementResult}: ${diagnostics.lastEnforcementResult}`,
    `${c.diagnosticLabels.permissions}: ${(
      Object.keys(diagnostics.permissions) as (keyof Permissions)[]
    )
      .map((name) => `${c.permissionNames[name]} ${c.statuses[diagnostics.permissions[name]]}`)
      .join(', ')}`,
  ].join('\n');

  // A failed send keeps the typed message and offers an explicit retry: offline copy wins over the
  // generic error, because a request that never left the device cannot be judged any other way.
  const send = async () => {
    if (!canSend) {
      setReplyTouched(true);
      return;
    }
    Keyboard.dismiss();
    setState('sending');
    try {
      await runtime.support.send({
        category,
        message: message.trim(),
        replyTo: replyTo.trim(),
        diagnostics,
      });
      setState('sent');
    } catch (error) {
      setError(
        await apiFailureMessage(error, runtime.reachability, {
          offline: common.offline,
          timeout: c.timeoutError,
          rejected: c.rejectedError,
          fallback: c.error,
        }),
      );
      setState('error');
    }
  };

  if (state === 'sent')
    return <SupportSent onBack={onBack} />;

  return (
    <SettingsPage
      scrollToEndOnKeyboard
      onBack={onBack}
      footer={
        <PrimaryButton
          label={state === 'sending' ? c.sending : state === 'error' ? c.retrySend : c.send}
          loading={state === 'sending'}
          disabled={!canSend}
          onPress={() => void send()}
        />
      }>
      <Heading title={c.support} />
      <LivingIcon name="mail" />
      <SegmentedControl options={c.categories} value={category} onChange={(value) => setCategory(value as typeof category)} />
      <TextField label={c.message} value={message} onChangeText={setMessage} multiline maxLength={4000} />
      <TextField
        label={c.replyEmail}
        value={replyTo}
        onChangeText={setReplyTo}
        onBlur={() => setReplyTouched(true)}
        maxLength={254}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        error={replyTouched && !validEmail(replyTo) ? c.replyEmailError : undefined}
      />
      <Label variant="support" tone="secondary">
        {c.replyEmailHelp}
      </Label>
      <PressableScale label={c.diagnostics} onPress={() => setShowDiagnostics((shown) => !shown)}>
        <Label style={{ color: t.brand.primary }}>{c.diagnostics}</Label>
      </PressableScale>
      {showDiagnostics ? (
        <Reveal style={{ gap: t.space.sm }}>
          <Label variant="support" tone="secondary">
            {c.diagnosticsBody}
          </Label>
          <Label>{diagnosticsText}</Label>
        </Reveal>
      ) : null}
      {state === 'error' ? (
        <Reveal>
          <Label accessibilityRole="alert">{error}</Label>
        </Reveal>
      ) : null}
    </SettingsPage>
  );
}

export function SupportSent({ onBack }: { onBack: () => void }) {
  return (
    <SettingsPage onBack={onBack}>
      <Heading title={c.sent} support={c.sentBody} />
      <LivingIcon name="check" />
    </SettingsPage>
  );
}
