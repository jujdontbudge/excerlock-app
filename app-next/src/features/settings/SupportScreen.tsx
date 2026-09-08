import * as Application from 'expo-application';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { useState } from 'react';
import { Keyboard } from 'react-native';
import { Heading, Label, PressableScale, PrimaryButton, SegmentedControl, TextField } from '../../design-system';
import { settingsCopy as c } from '../../content/settings';
import { supportDiagnostics } from '../../domain/supportDiagnostics';
import { Permissions } from '../../domain/types';
import { tokens as t } from '../../design-system/tokens';
import { LivingIcon } from '../../motion/LivingIcon';
import { Reveal } from '../../motion/Reveal';
import { useRuntime } from '../../runtime/AppRuntimeProvider';
import { entitlementStore as useEntitlementStore } from '../../state/entitlementStore';
import { permissionsStore as usePermissionsStore } from '../../state/permissionsStore';
import { rulesStore as useRulesStore } from '../../state/rulesStore';
import { sessionStore as useSessionStore } from '../../state/sessionStore';
import { SettingsPage } from './SettingsPage';

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
  const lastEnforcement = [...runtime.dev.snapshot().events]
    .reverse()
    .find((event) => event.event === 'lock_applied')?.props.state;
  const diagnostics = supportDiagnostics({
    appVersion: Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? c.unavailable,
    appBuild: Application.nativeBuildVersion ?? Constants.expoConfig?.ios?.buildNumber ?? c.unavailable,
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
    } catch {
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
          label={state === 'sending' ? c.sending : c.send}
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
          <Label accessibilityRole="alert">{c.error}</Label>
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
