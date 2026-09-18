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

/** Two questions and Send. The runtime attaches the diagnostic snapshot; this screen never sees it. */
export function ReportProblemScreen({ onBack = () => {} }: { onBack?: () => void }) {
  const runtime = useRuntime(),
    [whatWentWrong, setWhatWentWrong] = useState(''),
    [shouldHaveHappened, setShouldHaveHappened] = useState(''),
    [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const ready = whatWentWrong.trim().length > 0 && shouldHaveHappened.trim().length > 0;
  const send = async () => {
    if (!ready || state === 'sending') return;
    Keyboard.dismiss();
    setState('sending');
    try {
      await runtime.incidentReports.send({ whatWentWrong: whatWentWrong.trim(), shouldHaveHappened: shouldHaveHappened.trim() });
      setState('sent');
    } catch {
      setState('error');
    }
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
          disabled={!ready}
          onPress={() => void send()}
        />
      }>
      <Heading title={i.title} support={i.support} />
      <TextField
        label={i.wrongField}
        labelTone="primary"
        value={whatWentWrong}
        onChangeText={setWhatWentWrong}
        placeholder={i.wrongPlaceholder}
        multiline
        maxLength={4000}
      />
      <TextField
        label={i.expectedField}
        labelTone="primary"
        value={shouldHaveHappened}
        onChangeText={setShouldHaveHappened}
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
      {state === 'error' ? (
        <Reveal>
          <Label accessibilityRole="alert">{i.error}</Label>
        </Reveal>
      ) : null}
    </SettingsPage>
  );
}
