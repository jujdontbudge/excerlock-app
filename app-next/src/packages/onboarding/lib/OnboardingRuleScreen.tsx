import { useEffect, useMemo } from 'react';
import { AnswerProps } from './types';
import { createDraft, DraftAction, reduceDraft } from '../../conditions/draft';
import { useRuleDraftStore } from '../../conditions/RuleDraftStore';
import { RuleScreen, BranchStep } from '../../conditions/RuleScreen';
import { Activity } from '../../model/types';
import { draftFromAnswers, goalStep } from './plan';
import { conditionSentence } from '../../conditions/conditionSentence';
import { ConditionPreview } from '../../conditions/ConditionPreview';
import { scheduleDraft, toSchedule } from '../../conditions/scheduleDraft';
export function OnboardingRuleScreen({ step, answers, setAnswer }: AnswerProps & { step: BranchStep }) {
  const activity = (answers.activity ?? 'walking') as Activity;
  const base = useMemo(() => createDraft(activity), [activity]);
  const draft = useMemo(() => draftFromAnswers(answers, base), [answers, base]);
  const schedule = useMemo(() => toSchedule(scheduleDraft(answers)), [answers]);
  useEffect(() => {
    useRuleDraftStore.getState().replace(draft);
  }, [draft]);
  const onAction = (action: DraftAction) => {
    useRuleDraftStore.getState().replace(reduceDraft(draft, action));
    const number = (value: number) => (Number.isFinite(value) ? String(value) : '');
    switch (action.type) {
      case 'setWalkingMode':
        setAnswer('walkingMode', action.value);
        break;
      case 'setStepGoal':
        setAnswer('stepGoal', number(action.value));
        break;
      case 'setWalkMinutes':
        setAnswer('walkMinutes', number(action.value));
        break;
      case 'setGymMode':
        setAnswer('gymMode', action.value);
        break;
      case 'setGymMinutes':
        setAnswer('gymMinutes', number(action.value));
        break;
    }
  };
  return (
    <RuleScreen
      step={step}
      draft={draft}
      onAction={onAction}
      preview={
        <ConditionPreview
          icon={activity}
          schedule={schedule}
          sentence={conditionSentence(answers, draft, { schedule, goalChosen: step === goalStep(draft) })}
        />
      }
    />
  );
}
