import { render, screen, userEvent } from '@testing-library/react-native';
import { createDraft, toRuleOrThrow, tryRule } from '../draft';
import { PlanSummary } from '../PlanSummary';
import { saveRule } from '../../conditions/mutations';
import { planCopy as c } from '../../../content/plan';
import { Schedule } from '../../../domain/types';

const schedule: Schedule = { days: [1, 2, 3, 4, 5], window: { kind: 'range', startMinute: 540, endMinute: 1260 } };

test('PlanSummary renders an inline needs-a-change row with an Edit link for an invalid draft instead of throwing', async () => {
  const onEdit = jest.fn();
  const draft = { ...createDraft('walking'), stepGoal: 123 };

  await render(<PlanSummary draft={draft} schedule={schedule} onEdit={onEdit} />);

  expect(screen.getByText(c.needsChange)).toBeTruthy();
  await userEvent.press(screen.getByRole('button', { name: c.editGoal }));
  expect(onEdit).toHaveBeenCalledWith('W3');
});

test('an invalid schedule points its Edit link at the schedule step', async () => {
  const onEdit = jest.fn();

  await render(<PlanSummary draft={createDraft('walking')} schedule={{ ...schedule, days: [] }} onEdit={onEdit} />);

  await userEvent.press(screen.getByRole('button', { name: c.editSchedule }));
  expect(onEdit).toHaveBeenCalledWith('S1');
});

test('tryRule reports issues instead of throwing and returns the rule when the draft is sound', () => {
  expect(tryRule({ ...createDraft('walking'), stepGoal: 123 }, schedule)).toEqual({ issues: ['goal'] });
  expect(tryRule(createDraft('walking'), schedule)).toMatchObject({ rule: { activity: 'walking' } });
});

test('saveRule still rejects an invalid rule through toRuleOrThrow', () => {
  expect(() => toRuleOrThrow({ ...createDraft('walking'), stepGoal: 123 }, schedule)).toThrow('goal');
  expect(() => saveRule({ ...toRuleOrThrow(createDraft('walking'), schedule), id: '' })).toThrow();
});
