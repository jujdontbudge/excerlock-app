import { setUnits } from '../preferences';
import { rulesStore } from '../../../state/rulesStore';
import { settingsStore } from '../../../state/settingsStore';
import { createDraft, toRule } from '../../rules/draft';
import { toSchedule, scheduleDraft } from '../../rules/scheduleDraft';
import { ruleName } from '../../../domain/ruleName';
test('units switch freely and leave step and minute goals untouched', () => {
  const walking = toRule(
    { ...createDraft('walking'), stepGoal: 8000 },
    toSchedule(scheduleDraft({})),
  );
  const gym = toRule({ ...createDraft('gym'), gymMinutes: 45 }, toSchedule(scheduleDraft({})));
  rulesStore.getState().patch({ rules: [walking, gym] });
  setUnits('km');
  expect(settingsStore.getState().data.units).toBe('km');
  expect(ruleName(rulesStore.getState().data.rules[0])).toBe('Walk 8,000 steps');
  expect(ruleName(rulesStore.getState().data.rules[1])).toBe('Spend 45 minutes at the gym');
  setUnits('mi');
  expect(settingsStore.getState().data.units).toBe('mi');
  expect(rulesStore.getState().data.rules).toHaveLength(2);
});
