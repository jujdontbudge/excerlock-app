import { Keyboard } from 'react-native';
import { useState } from 'react';
import { SettingsPage } from '../../ui/SettingsPage';
import { Heading, Label, TextField, PrimaryButton, SecondaryButton } from '../../ui';
import { supportCopy as s } from '../supportCopy';
import { LivingIcon } from '../../ui/LivingIcon';
import { Reveal } from '../../ui/Reveal';
import { useRuntime } from '../../ports/useRuntime';
import { openSupportEmail } from '../SupportDelivery';
import { SupportCategory } from '../../ports/SupportPort';
import { IconName } from '../../ui/Icon';

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
        footer={<PrimaryButton label={s.done} onPress={onBack} />}>
        <Heading
          title={state === 'handedOff' ? s.handedOff : sent}
          support={state === 'handedOff' ? s.handedOffBody : s.sentBody}
        />
        <LivingIcon name={state === 'handedOff' ? 'mail' : 'check'} />
      </SettingsPage>
    );
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
        autoComplete="email"
        maxLength={254}
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
