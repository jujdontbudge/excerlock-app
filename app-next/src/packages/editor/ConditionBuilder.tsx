import { GymBackgroundSetup } from '../gyms/GymBackgroundSetup';
import { pageIn, pageOut } from '../ui/presets';
import { useState } from 'react';
import Animated from 'react-native-reanimated';
import { ScreenShell, PrimaryButton, OnboardingHeader } from '../ui';
import { tokens as t } from '../ui/tokens';
import { useMotion } from '../ui/useMotion';
import { conditionsCopy as c } from '../conditions/conditionsCopy';
import { O20 } from '../onboarding/O20';
import { RuleScreen, BranchStep } from '../conditions/RuleScreen';
import { ScheduleScreen } from '../conditions/ScheduleScreen';
import { TimeSheet } from '../conditions/TimeSheet';
import { PlanSummary } from '../onboarding/PlanSummary';
import { toSchedule } from '../conditions/scheduleDraft';
import { Activity, Rule } from '../model/types';
import { SetupPresentation } from '../ui/SetupPresentation';
import { ConfirmSheet } from '../ui/ConfirmSheet';
import { useBuilder } from './lib/useBuilder';
import { BuilderGymStep } from '../gyms/BuilderGymStep';
export function ConditionBuilder({ id, onClose, onNeeds, onStage }: {
  id?: string;
  onClose: () => void;
  onNeeds?: () => void;
  onStage?: (rule: Rule) => void;
}) {
  const f = useBuilder(id, onClose, onNeeds, onStage),
    m = useMotion(),
    [wheel, setWheel] = useState<'start' | 'end' | null>(null);
  const branch = !['O20', 'S1', 'S3', 'GPlace'].includes(f.step);
  const enter = pageIn(m.reduced, f.direction);
  const exit = pageOut(m.reduced, f.direction);
  if (f.step === 'GPlace') return <BuilderGymStep onSaved={f.next} onBack={f.back} onClose={f.cancel} />;
  return (
    <SetupPresentation>
    <ScreenShell
      scrollResetKey={f.step}
      bounce={f.step !== 'S1'}
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
          <PrimaryButton label={f.step === 'S3' ? c.save : c.continue} disabled={!f.valid} onPress={f.next} />
        </Animated.View>
      }
      overlay={
        <>
          {f.draft.activity === 'gym' && !onStage ? <GymBackgroundSetup /> : null}
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
      <Animated.View key={branch ? 'branch' : f.step} entering={enter} exiting={exit} style={{ flexGrow: 1, gap: t.space.xl }}>
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
