import { useEffect, useMemo } from 'react';
import { AnswerProps } from '../onboarding/types';
import { createDraft, DraftAction, reduceDraft } from './draft';
import { useRuleDraftStore } from './RuleDraftStore';
import { WalkingScreen } from './WalkingScreen';
import { settingsStore as useSettingsStore } from '../../state/settingsStore';
export function OnboardingRuleScreen({ step, answers, setAnswer }: AnswerProps & { step: 'W1' | 'W2' | 'W3' }) {
  const unit = useSettingsStore((s) => s.data.units);
  const base = useMemo(() => createDraft('walking', unit), [unit]);
  const draft = useMemo(
    () => ({
      ...base,
      place: (answers.walkPlace ?? 'outside') as typeof base.place,
      walkingMode: (answers.walkingMode ?? 'target') as typeof base.walkingMode,
      stepGoal: answers.stepGoal === undefined ? 5000 : Number(answers.stepGoal),
    }),
    [base, answers.walkPlace, answers.walkingMode, answers.stepGoal],
  );
  useEffect(() => {
    useRuleDraftStore.getState().replace(draft);
  }, [draft]);
  const onAction = (action: DraftAction) => {
    useRuleDraftStore.getState().replace(reduceDraft(draft, action));
    if (action.type === 'setPlace') setAnswer('walkPlace', action.value);
    if (action.type === 'setWalkingMode') setAnswer('walkingMode', action.value);
    if (action.type === 'setStepGoal') setAnswer('stepGoal', Number.isFinite(action.value) ? String(action.value) : '');
  };
  return <WalkingScreen step={step} draft={draft} onAction={onAction} />;
}
