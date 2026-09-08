import { Keyboard } from 'react-native';
import { SettingsPage } from './SettingsPage';
import { useState } from 'react';
import { Heading, Label, TextField, PrimaryButton, SegmentedControl } from '../../design-system';
import { settingsCopy as c } from '../../content/settings';
import { LivingIcon } from '../../motion/LivingIcon';
import { Reveal } from '../../motion/Reveal';
import { useRuntime } from '../../runtime/AppRuntimeProvider';
import { requestFailureMessage } from '../../runtime/requestFailureMessage';
import { common } from '../../content/common';
export function SupportScreen({ onBack = () => {} }: { onBack?: () => void }) {
  const runtime = useRuntime(),
    [category, setCategory] = useState<'Problem' | 'Question' | 'Idea'>('Problem'),
    [message, setMessage] = useState(''),
    [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle'),
    [error, setError] = useState('');
  const send = async () => {
    if (!message.trim() || state === 'sending') return;
    Keyboard.dismiss();
    setState('sending');
    try {
      await runtime.support.send(category, message);
      setState('sent');
    } catch {
      setError(await requestFailureMessage(runtime.reachability, { offline: common.offline, fallback: c.error }));
      setState('error');
    }
  };
  if (state === 'sent')
    return (
      <SettingsPage onBack={onBack}>
        <Heading title={c.sent} support={c.sentBody} />
        <LivingIcon name="check" />
      </SettingsPage>
    );
  return (
    <SettingsPage
      scrollToEndOnKeyboard
      onBack={onBack}
      footer={
        <PrimaryButton
          label={state === 'sending' ? c.sending : state === 'error' ? c.retrySend : c.send}
          loading={state === 'sending'}
          disabled={!message.trim()}
          onPress={() => void send()}
        />
      }>
      <Heading title={c.support} />
      <LivingIcon name="mail" />
      <SegmentedControl options={c.categories} value={category} onChange={(v) => setCategory(v as typeof category)} />
      <TextField label={c.message} value={message} onChangeText={setMessage} multiline maxLength={4000} />
      {state === 'error' ? (
        <Reveal>
          <Label accessibilityRole="alert">{error}</Label>
        </Reveal>
      ) : null}
    </SettingsPage>
  );
}
