import { Keyboard, View } from 'react-native';
import { useState } from 'react';
import { SettingsPage } from './SettingsPage';
import { Heading, Label, TextField, PrimaryButton } from '../../design-system';
import { tokens as t } from '../../design-system/tokens';
import { settingsCopy as c } from '../../content/settings';
import { incidentCopy as i } from '../../content/incident';
import { LivingIcon } from '../../motion/LivingIcon';
import { Reveal } from '../../motion/Reveal';
import { useRuntime } from '../../runtime/AppRuntimeProvider';

/**
 * Two questions and Send. The runtime attaches the diagnostic snapshot; this screen never sees it.
 * Send is always pressable (except mid-send): a tap with a missing answer says which one, a failed
 * send shows its reason on screen and keeps the words for a retry. Nothing is swallowed.
 */
export function ReportProblemScreen({ onBack = () => {} }: { onBack?: () => void }) {
  const runtime = useRuntime(),
    [whatWentWrong, setWhatWentWrong] = useState(''),
    [shouldHaveHappened, setShouldHaveHappened] = useState(''),
    [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle'),
    [message, setMessage] = useState<{ text: string; reason?: string } | null>(null);
  const missing = () => {
    const wrong = whatWentWrong.trim().length > 0,
      expected = shouldHaveHappened.trim().length > 0;
    if (wrong && expected) return null;
    return !wrong && !expected ? i.missingBoth : wrong ? i.missingExpected : i.missingWrong;
  };
  const send = async () => {
    if (state === 'sending') return;
    const nag = missing();
    if (nag) {
      setMessage({ text: nag });
      return;
    }
    Keyboard.dismiss();
    setMessage(null);
    setState('sending');
    try {
      await runtime.incidentReports.send({ whatWentWrong: whatWentWrong.trim(), shouldHaveHappened: shouldHaveHappened.trim() });
      setState('sent');
    } catch (error) {
      setState('idle');
      setMessage({ text: i.error, reason: error instanceof Error ? error.message : String(error) });
    }
  };
  const edit = (set: (value: string) => void) => (value: string) => {
    set(value);
    setMessage(null);
  };
  if (state === 'sent')
    return (
      <SettingsPage onBack={onBack} footer={<PrimaryButton label={c.done} onPress={onBack} />}>
        <Heading title={i.sentTitle} support={i.sentBody} />
        <LivingIcon name="check" />
      </SettingsPage>
    );
  return (
    <SettingsPage
      scrollToEndOnKeyboard
      onBack={onBack}
      footer={
        <PrimaryButton
          label={state === 'sending' ? i.sending : i.send}
          loading={state === 'sending'}
          onPress={() => void send()}
        />
      }>
      <Heading title={i.title} support={i.support} />
      <TextField
        label={i.wrongField}
        labelTone="primary"
        value={whatWentWrong}
        onChangeText={edit(setWhatWentWrong)}
        placeholder={i.wrongPlaceholder}
        multiline
        maxLength={4000}
      />
      <TextField
        label={i.expectedField}
        labelTone="primary"
        value={shouldHaveHappened}
        onChangeText={edit(setShouldHaveHappened)}
        placeholder={i.expectedPlaceholder}
        multiline
        maxLength={4000}
      />
      <View
        style={{
          backgroundColor: t.surface.card,
          borderWidth: t.stroke.hairline,
          borderColor: t.border.outline,
          borderRadius: t.radius.card,
          padding: t.space.lg,
          gap: t.space.sm,
        }}>
        <Label variant="label">{i.attached}</Label>
        <Label tone="secondary" variant="support">
          {i.attachedBody}
        </Label>
      </View>
      {message ? (
        <Reveal key={message.text + (message.reason ?? '')}>
          <Label accessibilityRole="alert">{message.text}</Label>
          {message.reason ? (
            <Label tone="secondary" variant="support">
              {message.reason}
            </Label>
          ) : null}
        </Reveal>
      ) : null}
    </SettingsPage>
  );
}
