import { createDraft } from '../draft';
import { rulePreviewModel } from '../rulePreviewModel';

test.each([
  [{ ...createDraft('walking'), walkingMode: 'steps' as const, stepGoal: 5000 }, 'until you walk 5,000 steps', '0 / 5,000 steps'],
  [{ ...createDraft('walking'), walkingMode: 'minutes' as const, walkMinutes: 20 }, 'until you walk for 20 minutes', '0 / 20 minutes'],
  [{ ...createDraft('walking'), walkingMode: 'state' as const }, 'unless you are walking', 'Waiting for your walk'],
  [{ ...createDraft('gym'), gymMode: 'arrival' as const }, 'until you arrive at the gym', 'Waiting for gym arrival'],
  [{ ...createDraft('gym'), gymMode: 'time' as const, gymMinutes: 45 }, 'until you exercise for 45 minutes', '0 / 45 minutes'],
  [{ ...createDraft('running'), runMode: 'minutes' as const, minutes: 20 }, 'until you run for 20 minutes', '0 / 20 minutes'],
  [{ ...createDraft('running'), runMode: 'distance' as const, distance: 2, unit: 'mi' as const }, 'until you run 2 mi', '0 / 2 mi'],
  [{ ...createDraft('biking'), runMode: 'minutes' as const, minutes: 30 }, 'until you bike for 30 minutes', '0 / 30 minutes'],
  [{ ...createDraft('biking'), runMode: 'distance' as const, distance: 5, unit: 'mi' as const }, 'until you bike 5 mi', '0 / 5 mi'],
] as const)('builds the live lock preview for every rule path', (draft, condition, progress) => {
  const preview = rulePreviewModel(draft);
  expect(preview.message).toBe(`Block from 9 AM to 9 PM\n${condition}`);
  expect(preview.progress).toBe(progress);
});
