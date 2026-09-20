import { useIsFocused } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
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
import { PlanCelebration } from '../rules/PlanCelebration';
import { PlanSummary } from '../rules/PlanSummary';
import { ConditionDemo } from './condition-demo/ConditionDemo';
import { ReviewWarmup } from '../rules/ReviewWarmup';
import { settingsStore as useSettingsStore } from '../../state/settingsStore';
import { planCopy as c } from '../../content/plan';
import { useImpactPlayback } from './impact/useImpactPlayback';
import { useRuntime } from '../../runtime/AppRuntimeProvider';
import { SchedulePlanError } from '../../domain/scheduleRepresentability';
import { Label } from '../../design-system';
import { tokens as t } from '../../design-system/tokens';
export function OnboardingRoute() {
  const focused = useIsFocused();
  const runtime = useRuntime();
  const flow = useOnboarding(),
    unit = useSettingsStore((s) => s.data.units),
    [wheel, setWheel] = useState<'start' | 'end' | null>(null),
    [scheduleError, setScheduleError] = useState(false),
    [celebrating, setCelebrating] = useState(false);
  const playback = useImpactPlayback(flow.step, flow.advance, focused);
  const base = useMemo(() => createDraft('walking'), []);
  const draft = draftFromAnswers(flow.answers, base),
    schedule = scheduleDraft(flow.answers);
  const onSchedule = (action: ScheduleAction) =>
    Object.entries(scheduleAnswers(reduceSchedule(schedule, action))).forEach(([key, value]) =>
      flow.setAnswer(key, value),
    );
  const advance = () => {
    if (flow.step === 'S3') {
      try {
        commitPlan(flow.answers, unit, draft, {
          now: runtime.clock.now(),
          timezone: runtime.clock.timezone(),
        });
        setScheduleError(false);
      } catch (error) {
        if (!(error instanceof SchedulePlanError)) throw error;
        setScheduleError(true);
        return;
      }
    }
    flow.advance();
  };
  // A pushed route can retain an earlier summary while this shared draft is incomplete.
  if (!focused) return null;
  let body = <PreBranchScreen {...flow} />;
  if (flow.step === 'T1' || flow.step === 'T2' || flow.step === 'T3' || flow.step === 'T4')
    body = <TrialScreen step={flow.step} onContinue={flow.advance} />;
  if (flow.step === 'S1')
    body = (
      <ScheduleScreen
        ruleDraft={draft}
        draft={schedule}
        onAction={onSchedule}
        onChoose={setWheel}
      />
    );
  if (flow.step === 'S2') body = <PlanBuild rule={toRule(draft, toSchedule(schedule))} onComplete={() => setCelebrating(true)} />;
  if (flow.step === 'S3')
    body = (
      <View style={{ gap: t.space.lg }}>
        <PlanSummary draft={draft} schedule={toSchedule(schedule)} onEdit={flow.edit} answers={flow.answers} />
        {scheduleError ? <Label style={{ color: t.text.secondary }}>{c.scheduleLimit}</Label> : null}
      </View>
    );
  if (flow.step === 'S3b') body = <ConditionDemo draft={draft} schedule={toSchedule(schedule)} answers={flow.answers} onBack={flow.back} />;
  if (flow.step === 'S4') body = <ReviewWarmup onSkip={flow.advance} />;
  return (
    <OnboardingShell
      step={flow.step}
      progress={flow.progress}
      direction={flow.direction}
      onBack={flow.back}
      onContinue={advance}
      valid={canContinue(flow.step, flow.answers)}
      continuing={flow.isAdvancing}
      continueLabel={flow.step === 'S3' ? c.use : undefined}
      hideContinue={flow.step === 'S2' || flow.step === 'T3' || playback.hideContinue}
      overlay={
        <>
        {celebrating ? <PlanCelebration onCovered={() => { if (flow.step === 'S2') void flow.advance(); }} onDone={() => setCelebrating(false)} /> : null}
        <TimeSheet
          which={wheel}
          value={wheel ? schedule[wheel] : schedule.start}
          onChange={(value) => {
            if (wheel) onSchedule({ type: wheel, value });
          }}
          onDismiss={() => setWheel(null)}
        />
        </>
      }>
      {body}
    </OnboardingShell>
  );
}
