import { useIsFocused } from 'expo-router';
import { notify } from '../ui/Notice';
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { OnboardingShell } from './lib/OnboardingShell';
import { useOnboarding } from './lib/useOnboarding';
import { canContinue } from './lib/validation';
import { PreBranchScreen } from './lib/PreBranchScreen';
import { ScheduleScreen } from '../conditions/ScheduleScreen';
import { TimeSheet } from '../conditions/TimeSheet';
import { scheduleDraft, reduceSchedule, scheduleAnswers, toSchedule, ScheduleAction } from '../conditions/scheduleDraft';
import { draftFromAnswers, stagePlan } from './lib/plan';
import { createDraft, toRule } from '../conditions/draft';
import { PlanBuild } from './lib/PlanBuild';
import { PlanCelebration } from './lib/PlanCelebration';
import { PlanSummary } from './PlanSummary';
import { ConditionDemo } from './lib/condition-demo/ConditionDemo';
import { PlanTrialPreview } from './PlanTrialPreview';
import { ResearchScreen } from './lib/ResearchScreen';
import { RatingScreen } from './lib/RatingScreen';
import { TrialReminder } from './lib/TrialReminder';
import { planCopy as c } from '../conditions/planCopy';
import { useImpactPlayback } from './lib/impact/useImpactPlayback';
import { useRuntime } from '../ports/useRuntime';
import { SchedulePlanError } from '../schedule/scheduleRepresentability';
import { haptic } from '../ui/haptics';
import { tokens as t } from '../ui/tokens';
export function OnboardingRoute() {
  const focused = useIsFocused();
  const runtime = useRuntime();
  const pageObscured = useRef(false);
  const flow = useOnboarding({ isPageStable: () => !pageObscured.current }),
    [wheel, setWheel] = useState<'start' | 'end' | null>(null),
    [celebrating, setCelebrating] = useState(false),
    [asking, setAsking] = useState(false),
    [demoReady, setDemoReady] = useState(false),
    [ratingReady, setRatingReady] = useState(false);
  useLayoutEffect(() => { pageObscured.current = wheel !== null || celebrating || asking; }, [wheel, celebrating, asking]);
  const promptBusy = useRef(false);
  const onDemoReady = useCallback(() => setDemoReady(true), []);
  const onRatingPrompted = useCallback(() => setRatingReady(true), []);
  const playback = useImpactPlayback(flow.step, flow.advance, focused);
  const base = useMemo(() => createDraft('walking'), []);
  const draft = draftFromAnswers(flow.answers, base),
    schedule = scheduleDraft(flow.answers);
  const onSchedule = (action: ScheduleAction) =>
    Object.entries(scheduleAnswers(reduceSchedule(schedule, action))).forEach(([key, value]) =>
      flow.setAnswer(key, value),
    );
  const advance = async () => {
    if (flow.step === 'S3b' && !demoReady) return;
    if (flow.step === 'S5') {
      if (!ratingReady) return;
      setRatingReady(false);
    }
    if (flow.step === 'S3d') {
      if (promptBusy.current) return;
      if (runtime.notifications.status() === 'notDetermined') {
        promptBusy.current = true;
        setAsking(true);
        try {
          if ((await runtime.notifications.request()) === 'granted') haptic('success');
        } catch {
          notify(c.permissionRetry);
          return;
        } finally {
          promptBusy.current = false;
          setAsking(false);
        }
      }
    }
    if (flow.step === 'S3') {
      try {
        stagePlan(flow.answers, draft, {
          now: runtime.clock.now(),
          timezone: runtime.clock.timezone(),
        });
        haptic('commit');
      } catch (error) {
        if (!(error instanceof SchedulePlanError)) throw error;
        notify(c.scheduleLimit);
        haptic('error');
        return;
      }
    }
    if (flow.step === 'S3b') setDemoReady(false);
    flow.advance();
  };
  if (!focused) return null;
  let body = <PreBranchScreen {...flow} />;
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
      </View>
    );
  if (flow.step === 'S4') body = <ResearchScreen />;
  if (flow.step === 'S5') body = <RatingScreen onPrompted={onRatingPrompted} />;
  if (flow.step === 'S3b') body = <ConditionDemo draft={draft} schedule={toSchedule(schedule)} answers={flow.answers} onReady={onDemoReady} onBack={() => { setDemoReady(false); flow.back(); }} />;
  if (flow.step === 'S3c') body = <PlanTrialPreview rule={toRule(draft, toSchedule(schedule))} onBack={flow.back} />;
  if (flow.step === 'S3d') body = <TrialReminder />;
  return (
    <OnboardingShell
      onTransitionStarted={flow.transitionStarted}
      onTransitionSettled={flow.transitionSettled}
      step={flow.step}
      progress={flow.progress}
      direction={flow.direction}
      onBack={() => { if (flow.step === 'S3b') setDemoReady(false); if (flow.step === 'S5') setRatingReady(false); flow.back(); }}
      onContinue={() => void advance()}
      valid={canContinue(flow.step, flow.answers) && (flow.step !== 'S3b' || demoReady) && (flow.step !== 'S5' || ratingReady)}
      continuing={flow.isAdvancing || asking}
      continueLabel={flow.step === 'S3' ? c.use : flow.step === 'S3c' ? c.trialCta : undefined}
      hideContinue={flow.step === 'S2' || playback.hideContinue}
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
