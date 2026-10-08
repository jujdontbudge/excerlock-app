import { Keyboard, View } from 'react-native';
import { useState } from 'react';
import { SettingsPage } from '../ui/SettingsPage';
import { Heading, Label, TextField, PrimaryButton } from '../ui';
import { tokens as t } from '../ui/tokens';
import { incidentCopy as i } from './incidentCopy';
import { LivingIcon } from '../ui/LivingIcon';
import { notify } from '../ui/Notice';
import { useRuntime } from '../ports/useRuntime';
import { useLockDecision } from '../lock/selectors';
import { activityTruthStore as useActivityTruthStore } from '../activity/activityTruthStore';
import { haptic } from '../ui/haptics';

export function ReportProblemScreen({ onBack = () => {} }: { onBack?: () => void }) {
  const runtime = useRuntime(),
    lockState = useLockDecision().state,
    held = useActivityTruthStore((s) => s.data?.activity ?? 'none'),
    [whatWentWrong, setWhatWentWrong] = useState(''),
    [shouldHaveHappened, setShouldHaveHappened] = useState(''),
    [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
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
      notify(nag);
      haptic('warning');
      return;
    }
    Keyboard.dismiss();
    setState('sending');
    try {
      await runtime.incidentReports.send({ whatWentWrong: whatWentWrong.trim(), shouldHaveHappened: shouldHaveHappened.trim() });
      runtime.analytics.track('incident_report_sent', { source: 'settings', activity: held, lock_state: lockState });
      setState('sent');
      haptic('success');
    } catch {
      setState('idle');
      notify(i.error);
      haptic('error');
    }
  };
  const edit = (set: (value: string) => void) => (value: string) => set(value);
  if (state === 'sent')
    return (
      <SettingsPage onBack={onBack} footer={<PrimaryButton label={i.done} onPress={onBack} />}>
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
          label={i.send}
          loading={state === 'sending'}
          onPress={() => void send()}
        />
      }>
      <Heading title={i.title} support={i.support} centered />
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
          backgroundColor: t.surface.softChoice,
          borderWidth: t.stroke.hairline,
          borderColor: t.surface.transparent,
          borderRadius: t.radius.card,
          padding: t.space.lg,
          gap: t.space.sm,
        }}>
        <Label variant="label">{i.attached}</Label>
        <Label tone="secondary" variant="support">
          {i.attachedBody}
        </Label>
      </View>
    </SettingsPage>
  );
}
