import { useEffect, useMemo } from 'react';
import { AnswerProps } from '../onboarding/types';
import { createDraft, DraftAction, reduceDraft } from './draft';
import { useRuleDraftStore } from './RuleDraftStore';
import { RuleScreen, BranchStep } from './RuleScreen';
import { settingsStore as useSettingsStore } from '../../state/settingsStore';
import { Activity } from '../../domain/types';
import { draftFromAnswers } from './plan';
export function OnboardingRuleScreen({ step, answers, setAnswer }: AnswerProps & { step: BranchStep }) {
  const unit = useSettingsStore((s) => s.data.units),
    activity = (answers.activity ?? 'walking') as Activity;
  const base = useMemo(() => createDraft(activity, unit), [activity, unit]);
  const draft = useMemo(() => draftFromAnswers(answers, unit, base), [answers, unit, base]);
  useEffect(() => {
    useRuleDraftStore.getState().replace(draft);
  }, [draft]);
  const onAction = (action: DraftAction) => {
    useRuleDraftStore.getState().replace(reduceDraft(draft, action));
    const prefix = activity === 'biking' ? 'bike' : 'run';
    const number = (value: number) => (Number.isFinite(value) ? String(value) : '');
    switch (action.type) {
      case 'setPlace':
        setAnswer('walkPlace', action.value);
        if (action.value === 'treadmill' && draft.walkingMode === 'steps') setAnswer('walkingMode', 'minutes');
        break;
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
      case 'setRunMode':
        setAnswer(prefix + 'Mode', action.value);
        break;
      case 'setMinutes':
        setAnswer(prefix + 'Minutes', number(action.value));
        break;
      case 'setDistance':
        setAnswer(prefix + 'Distance', number(action.value));
        setAnswer(prefix + 'Unit', action.unit);
        break;
    }
  };
  return <RuleScreen step={step} draft={draft} onAction={onAction} />;
}
