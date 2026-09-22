import { opacityIn, opacityOut } from '../../motion/presets';
import { useState } from 'react';
import Animated, { SlideInRight, SlideInLeft, SlideOutLeft, SlideOutRight } from 'react-native-reanimated';
import { ScreenShell, PrimaryButton, OnboardingHeader, Label } from '../../design-system';
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
import { SetupPresentation } from '../../design-system/SetupPresentation';
import { ConfirmSheet } from './ConfirmSheet';
import { useBuilder } from './useBuilder';
import { BuilderGymStep } from '../gym-picker/BuilderGymStep';
export function ConditionBuilder({ id, onClose }: { id?: string; onClose: () => void }) {
  const f = useBuilder(id, onClose),
    m = useMotion(),
    [wheel, setWheel] = useState<'start' | 'end' | null>(null);
  const branch = !['O20', 'S1', 'S3', 'GPlace'].includes(f.step);
  const enter = m.reduced
    ? opacityIn(m.duration.sheet)
    : (f.direction === 'forward' ? SlideInRight : SlideInLeft).duration(m.duration.sheet);
  const exit = m.reduced
    ? opacityOut(m.duration.slow)
    : (f.direction === 'forward' ? SlideOutLeft : SlideOutRight).duration(m.duration.slow);
  if (f.step === 'GPlace') return <BuilderGymStep onSaved={f.next} onBack={f.back} onClose={f.cancel} />;
  return (
    <SetupPresentation>
    <ScreenShell
      scrollResetKey={f.step}
      header={
        <OnboardingHeader
          progress={0}
          showProgress={false}
          onBack={f.step === 'O20' || f.step === 'S3' ? f.cancel : f.back}
          onClose={f.cancel}
        />
      }
      footer={
        <Animated.View style={{ gap: t.space.sm }}>
          {f.scheduleError ? <Label style={{ color: t.text.secondary }}>{c.scheduleLimit}</Label> : null}
          <PrimaryButton label={f.step === 'S3' ? c.save : c.continue} disabled={!f.valid} onPress={f.next} />
        </Animated.View>
      }
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
      <Animated.View key={branch ? 'branch' : f.step} entering={enter} exiting={exit} style={{ gap: t.space.xl }}>
        {f.step === 'O20' ? (
          <O20
            answers={f.chosen ? { activity: f.draft.activity } : {}}
            setAnswer={(key, value) => { if (key === 'activity') f.choose(value as Activity); }}
          />
        ) : null}
        {branch ? <RuleScreen step={f.step as BranchStep} draft={f.draft} onAction={f.dispatch} /> : null}
        {f.step === 'S1' ? <ScheduleScreen draft={f.schedule} onAction={f.onSchedule} onChoose={setWheel} /> : null}
        {f.step === 'S3' ? <PlanSummary draft={f.draft} schedule={toSchedule(f.schedule)} onEdit={f.edit} editing={f.editing} /> : null}
      </Animated.View>
    </ScreenShell>
    </SetupPresentation>
  );
}
