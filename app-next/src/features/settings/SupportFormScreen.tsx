import { Keyboard, Platform, View } from 'react-native';
import { useState } from 'react';
import Constants from 'expo-constants';
import { SettingsPage } from './SettingsPage';
import { Heading, Label, TextField, PrimaryButton, SecondaryButton } from '../../design-system';
import { tokens as t } from '../../design-system/tokens';
import { settingsCopy as c } from '../../content/settings';
import { supportCopy as s } from '../../content/support';
import { LivingIcon } from '../../motion/LivingIcon';
import { Reveal } from '../../motion/Reveal';
import { useRuntime } from '../../runtime/AppRuntimeProvider';
import { openSupportEmail } from '../../runtime/SupportDelivery';
import { SupportCategory } from '../../ports/SupportPort';
import { IconName } from '../../icons/Icon';

export function SupportFormScreen({
  onBack = () => {},
  category,
  title,
  support,
  field,
  placeholder,
  submit,
  sent,
  icon,
  deviceInfo = false,
}: {
  onBack?: () => void;
  category: SupportCategory;
  title: string;
  support: string;
  field: string;
  placeholder: string;
  submit: string;
  sent: string;
  icon: IconName;
  deviceInfo?: boolean;
}) {
  const runtime = useRuntime(),
    [replyEmail, setReplyEmail] = useState(''),
    [message, setMessage] = useState(''),
    [state, setState] = useState<'idle' | 'sending' | 'sent' | 'handedOff' | 'error'>('idle');
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(replyEmail.trim());
  const send = async () => {
    if (!message.trim() || !emailValid || state === 'sending') return;
    Keyboard.dismiss();
    setState('sending');
    try {
      const { via } = await runtime.support.send(category, `Reply email: ${replyEmail.trim()}\n\n${message.trim()}`);
      setState(via === 'mail' ? 'handedOff' : 'sent');
    } catch {
      setState('error');
    }
  };
  const emailInstead = async () => {
    try {
      await openSupportEmail();
    } catch {
      setState('error');
    }
  };
  if (state === 'sent' || state === 'handedOff')
    return (
      <SettingsPage
        onBack={onBack}
        footer={<PrimaryButton label={c.done} onPress={onBack} />}>
        <Heading
          title={state === 'handedOff' ? s.handedOff : sent}
          support={state === 'handedOff' ? s.handedOffBody : s.sentBody}
        />
        <LivingIcon name={state === 'handedOff' ? 'mail' : 'check'} />
      </SettingsPage>
    );
  const model = Constants.deviceName ?? 'iPhone';
  const system = `iOS ${Platform.Version}`;
  const appVersion = c.version(Constants.expoConfig?.version ?? '1.0.0', Constants.expoConfig?.ios?.buildNumber ?? '1');
  return (
    <SettingsPage
      scrollToEndOnKeyboard
      onBack={onBack}
      footer={
        <>
          <PrimaryButton
            label={state === 'sending' ? s.sending : submit}
            loading={state === 'sending'}
            disabled={!message.trim() || !emailValid}
            onPress={() => void send()}
          />
          <SecondaryButton label={s.emailInstead} disabled={state === 'sending'} onPress={() => void emailInstead()} />
        </>
      }>
      <Heading title={title} support={support} />
      <LivingIcon name={icon} />
      <TextField
        label={s.replyEmail}
        value={replyEmail}
        onChangeText={setReplyEmail}
        placeholder={s.replyEmailPlaceholder}
        keyboardType="email-address"
        autoCapitalize="none"
        error={replyEmail.length > 0 && !emailValid ? s.replyEmailInvalid : undefined}
      />
      <TextField
        label={field}
        value={message}
        onChangeText={setMessage}
        placeholder={placeholder}
        multiline
        maxLength={4000}
      />
      {deviceInfo ? (
        <View
          style={{
            backgroundColor: t.surface.card,
            borderWidth: t.stroke.hairline,
            borderColor: t.border.outline,
            borderRadius: t.radius.card,
            padding: t.space.lg,
            gap: t.space.sm,
          }}>
          <Label variant="label">{s.deviceInfo}</Label>
          <Label tone="secondary" variant="support">
            {`${s.deviceModel}: ${model}`}
          </Label>
          <Label tone="secondary" variant="support">
            {`${s.deviceSystem}: ${system}`}
          </Label>
          <Label tone="secondary" variant="support">
            {`${s.deviceApp}: ${appVersion}`}
          </Label>
        </View>
      ) : null}
      {state === 'error' ? (
        <Reveal>
          <Label accessibilityRole="alert" selectable>
            {s.errorWithAddress}
          </Label>
        </Reveal>
      ) : null}
    </SettingsPage>
  );
}
