import { createDraft } from '../draft';
import { rulePreviewModel } from '../rulePreviewModel';

test.each([
  [{ ...createDraft('walking'), walkingMode: 'target' as const, stepGoal: 5000 }, 'until you walk 5,000 steps', '0 / 5,000 steps'],
  [{ ...createDraft('walking'), walkingMode: 'state' as const }, 'unless you are walking', 'Waiting for your walk'],
  [{ ...createDraft('gym'), gymMode: 'arrival' as const }, 'until you arrive at the gym', 'Waiting for gym arrival'],
  [{ ...createDraft('gym'), gymMode: 'time' as const, gymMinutes: 45 }, 'until you exercise for 45 minutes', '0 / 45 minutes'],
  [{ ...createDraft('gym'), gymMode: 'time' as const, gymMinutes: 10 }, 'until you exercise for 10 minutes', '0 / 10 minutes'],
  [{ ...createDraft('walking'), walkingMode: 'target' as const, stepGoal: 10000 }, 'until you walk 10,000 steps', '0 / 10,000 steps'],
] as const)('builds the live lock preview for every rule path', (draft, condition, progress) => {
  const preview = rulePreviewModel(draft);
  expect(preview.message).toBe(`Block from 9 AM to 9 PM\n${condition}`);
  expect(preview.progress).toBe(progress);
});
