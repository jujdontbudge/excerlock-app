import { setUnits } from '../preferences';
import { rulesStore } from '../../../state/rulesStore';
import { settingsStore } from '../../../state/settingsStore';
import { createDraft, toRule } from '../../rules/draft';
import { toSchedule, scheduleDraft } from '../../rules/scheduleDraft';
import { ruleName } from '../../../domain/ruleName';
test('units relabel existing distance rules and future builder defaults without converting their goals', () => {
  const d = { ...createDraft('running'), runMode: 'distance' as const, distance: 3 };
  rulesStore.getState().patch({ rules: [toRule(d, toSchedule(scheduleDraft({})))] });
  setUnits('km');
  expect(settingsStore.getState().data.units).toBe('km');
  expect(ruleName(rulesStore.getState().data.rules[0])).toBe('Run 3 km');
});
test('a unit change cannot persist an out-of-range saved goal', () => {
  const d = { ...createDraft('running'), runMode: 'distance' as const, distance: 0.25, unit: 'mi' as const };
  settingsStore.getState().patch({ units: 'mi' });
  rulesStore.getState().patch({ rules: [toRule(d, toSchedule(scheduleDraft({})))] });
  expect(() => setUnits('km')).toThrow();
  expect(settingsStore.getState().data.units).toBe('mi');
});
