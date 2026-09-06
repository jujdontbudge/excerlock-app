import { useState } from 'react';
import { View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideInLeft,
  SlideOutLeft,
  SlideOutRight,
} from 'react-native-reanimated';
import { ScreenShell, PrimaryButton, PressableScale, Label } from '../../design-system';
import { tokens as t } from '../../design-system/tokens';
import { useMotion } from '../../motion/useMotion';
import { conditionsCopy as c } from '../../content/conditions';
import { O20 } from '../onboarding/screens/O20';
import { RuleScreen, BranchStep } from '../rules/RuleScreen';
import { ScheduleScreen } from '../rules/ScheduleScreen';
import { TimeSheet } from '../rules/TimeSheet';
import { PlanSummary } from '../rules/PlanSummary';
import { toSchedule } from '../rules/scheduleDraft';
import { Activity } from '../../domain/types';
import { ConfirmSheet } from './ConfirmSheet';
import { useBuilder } from './useBuilder';
export function ConditionBuilder({ id, onClose }: { id?: string; onClose: () => void }) {
  const f = useBuilder(id, onClose),
    m = useMotion(),
    [wheel, setWheel] = useState<'start' | 'end' | null>(null);
  const branch = !['O20', 'S1', 'S3'].includes(f.step);
  const enter = m.reduced ? FadeIn : f.direction === 'forward' ? SlideInRight : SlideInLeft;
  const exit = m.reduced ? FadeOut : f.direction === 'forward' ? SlideOutLeft : SlideOutRight;
  return (
    <ScreenShell
      header={
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            paddingHorizontal: t.layout.page,
            paddingVertical: t.space.sm,
          }}>
          <PressableScale label={c.cancel} onPress={f.cancel}>
            <Label>{c.cancel}</Label>
          </PressableScale>
          {f.step !== 'O20' && f.step !== 'S3' ? (
            <PressableScale label={c.back} onPress={f.back}>
              <Label>{c.back}</Label>
            </PressableScale>
          ) : null}
        </View>
      }
      footer={<PrimaryButton label={f.step === 'S3' ? c.save : c.continue} disabled={!f.valid} onPress={f.next} />}
      overlay={
        <>
          <TimeSheet
            which={wheel}
            value={wheel ? f.schedule[wheel] : f.schedule.start}
            onChange={(value) => {
              if (wheel) f.onSchedule({ type: wheel, value });
            }}
            onDismiss={() => setWheel(null)}
          />
          <ConfirmSheet
            open={f.confirm}
            title={c.discardTitle}
            body={c.discardBody}
            confirm={c.discard}
            cancel={c.keep}
            onConfirm={f.discard}
            onCancel={f.keep}
          />
        </>
      }>
      <Animated.View
        key={branch ? 'branch' : f.step}
        entering={enter.duration(m.duration.sheet)}
        exiting={exit.duration(m.duration.slow)}
        style={{ gap: t.space.xl }}>
        {f.step === 'O20' ? (
          <O20
            answers={f.chosen ? { activity: f.draft.activity } : {}}
            setAnswer={(_, value) => f.choose(value as Activity)}
          />
        ) : null}
        {branch ? <RuleScreen step={f.step as BranchStep} draft={f.draft} onAction={f.dispatch} /> : null}
        {f.step === 'S1' ? <ScheduleScreen draft={f.schedule} onAction={f.onSchedule} onChoose={setWheel} /> : null}
        {f.step === 'S3' ? <PlanSummary draft={f.draft} schedule={toSchedule(f.schedule)} onEdit={f.edit} /> : null}
      </Animated.View>
    </ScreenShell>
  );
}
