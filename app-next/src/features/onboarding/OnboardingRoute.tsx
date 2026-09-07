import { useIsFocused } from 'expo-router';
import { useMemo, useState } from 'react';
import { TrialScreen } from '../subscription/TrialScreen';
import { OnboardingShell } from './OnboardingShell';
import { useOnboarding } from './useOnboarding';
import { canContinue } from '../../onboarding/validation';
import { PreBranchScreen } from './PreBranchScreen';
import { ScheduleScreen } from '../rules/ScheduleScreen';
import { TimeSheet } from '../rules/TimeSheet';
import { scheduleDraft, reduceSchedule, scheduleAnswers, toSchedule, ScheduleAction } from '../rules/scheduleDraft';
import { draftFromAnswers, commitPlan } from '../rules/plan';
import { createDraft, toRule } from '../rules/draft';
import { PlanBuild } from '../rules/PlanBuild';
import { PlanSummary } from '../rules/PlanSummary';
import { ReviewWarmup } from '../rules/ReviewWarmup';
import { settingsStore as useSettingsStore } from '../../state/settingsStore';
import { planCopy as c } from '../../content/plan';
import { useImpactPlayback } from './impact/useImpactPlayback';
export function OnboardingRoute() {
  const focused = useIsFocused();
  const flow = useOnboarding(),
    unit = useSettingsStore((s) => s.data.units),
    [wheel, setWheel] = useState<'start' | 'end' | null>(null);
  const playback = useImpactPlayback(flow.step, flow.advance, focused);
  const base = useMemo(() => createDraft('walking', unit), [unit]);
  const draft = draftFromAnswers(flow.answers, unit, base),
    schedule = scheduleDraft(flow.answers);
  const onSchedule = (action: ScheduleAction) =>
    Object.entries(scheduleAnswers(reduceSchedule(schedule, action))).forEach(([key, value]) =>
      flow.setAnswer(key, value),
    );
  const advance = () => {
    if (flow.step === 'S3') commitPlan(flow.answers, unit, draft);
    flow.advance();
  };
  // A pushed route can retain an earlier summary while this shared draft is incomplete.
  if (!focused) return null;
  let body = <PreBranchScreen {...flow} />;
  if (flow.step === 'T1' || flow.step === 'T2' || flow.step === 'T3' || flow.step === 'T4')
    body = <TrialScreen step={flow.step} onContinue={flow.advance} />;
  if (flow.step === 'S1') body = <ScheduleScreen draft={schedule} onAction={onSchedule} onChoose={setWheel} />;
  if (flow.step === 'S2') body = <PlanBuild rule={toRule(draft, toSchedule(schedule))} onComplete={flow.advance} />;
  if (flow.step === 'S3') body = <PlanSummary draft={draft} schedule={toSchedule(schedule)} onEdit={flow.edit} />;
  if (flow.step === 'S4') body = <ReviewWarmup onSkip={flow.advance} />;
  return (
    <OnboardingShell
      step={flow.step}
      progress={flow.progress}
      direction={flow.direction}
      onBack={flow.back}
      onContinue={advance}
      valid={canContinue(flow.step, flow.answers)}
      continueLabel={flow.step === 'S3' ? c.use : undefined}
      hideContinue={flow.step === 'S2' || flow.step === 'T3' || playback.hideContinue}
      overlay={
        <TimeSheet
          which={wheel}
          value={wheel ? schedule[wheel] : schedule.start}
          onChange={(value) => {
            if (wheel) onSchedule({ type: wheel, value });
          }}
          onDismiss={() => setWheel(null)}
        />
      }>
      {body}
    </OnboardingShell>
  );
}
