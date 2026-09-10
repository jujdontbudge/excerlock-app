import { render, screen, userEvent, fireEvent } from '@testing-library/react-native';
import { ConditionBuilder } from '../ConditionBuilder';
import { ConditionsScreen } from '../ConditionsScreen';
import { AppRuntimeProvider } from '../../../runtime/AppRuntimeProvider';
import { createRuntime } from '../../../runtime/createRuntime';
import { rulesStore } from '../../../state/rulesStore';
import { createDraft, toRule } from '../../rules/draft';
import { scheduleDraft, toSchedule } from '../../rules/scheduleDraft';
import { validateRule } from '../../../domain/validateRule';
import type { Rule } from '../../../domain/types';
const leave = jest.fn();
const separatedRules = (count: number, enabled = true): Rule[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `separated-${index}`,
    activity: 'walking',
    mode: { kind: 'target', activity: 'walking', metric: 'steps', goal: 5000 },
    schedule: { days: [0], window: { kind: 'range', startMinute: index * 60, endMinute: index * 60 + 30 } },
    enabled,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  }));
jest.mock('../../sheets/GymPicker', () => ({
  GymPicker: ({ open, onSaved, onDismiss }: { open: boolean; onSaved?: () => void; onDismiss: () => void }) => {
    const { GymPickerScreen } = require('../../gym-picker/GymPickerScreen');
    return open ? (
      <GymPickerScreen
        onSaved={() => {
          onSaved?.();
          onDismiss();
        }}
        onBack={onDismiss}
      />
    ) : null;
  },
}));
async function mount(id?: string) {
  const runtime = createRuntime();
  await runtime.dev.load('fresh-install');
  if (id)
    rulesStore.getState().patch({ rules: [{ ...toRule(createDraft('gym'), toSchedule(scheduleDraft({}))), id }] });
  await render(
    <AppRuntimeProvider runtime={runtime}>
      <ConditionBuilder id={id} onClose={leave} />
    </AppRuntimeProvider>,
  );
  return runtime;
}
test.each([
  ['Walking', 'Reach a step goal (Recommended)', 2],
  ['Walking', 'Unlock while walking', 0],
  ['Gym', 'Spend time at the gym', 1],
  ['Gym', 'Arrive at the gym', 0],
])('creates valid %s / %s without onboarding', async (activity, mode, extra) => {
  await mount();
  await userEvent.press(screen.getByRole('radio', { name: activity }));
  await userEvent.press(screen.getByRole('button', { name: 'Continue' }));
  if (activity === 'Walking') await userEvent.press(screen.getByRole('button', { name: 'Continue' }));
  await userEvent.press(screen.getByRole('radio', { name: mode }));
  await userEvent.press(screen.getByRole('button', { name: 'Continue' }));
  if (activity === 'Gym') {
    await userEvent.press(screen.getByRole('button', { name: 'Save gym' }));
  }
  if (extra) await userEvent.press(screen.getByRole('button', { name: 'Continue' }));
  await userEvent.press(screen.getByRole('button', { name: 'Continue' }));
  await userEvent.press(screen.getByRole('button', { name: 'Save condition' }));
  expect(rulesStore.getState().data.rules).toHaveLength(1);
  expect(validateRule(rulesStore.getState().data.rules[0])).toEqual([]);
});
test('editing preserves identity and schedule; dirty cancel requires discard', async () => {
  await mount('edit-me');
  const before = rulesStore.getState().data.rules[0];
  await userEvent.press(screen.getByRole('button', { name: 'Edit goal' }));
  await fireEvent(screen.getByLabelText('Goal'), 'accessibilityAction', {
    nativeEvent: { actionName: 'increment' },
  });
  await userEvent.press(screen.getByRole('button', { name: 'Continue' }));
  await userEvent.press(screen.getByRole('button', { name: 'Back' }));
  expect(screen.getByText('Discard changes?')).toBeTruthy();
  await userEvent.press(screen.getByRole('button', { name: 'Keep editing' }));
  await userEvent.press(screen.getByRole('button', { name: 'Save condition' }));
  const after = rulesStore.getState().data.rules[0];
  expect(after.id).toBe(before.id);
  expect(after.schedule).toEqual(before.schedule);
  expect(after.mode).toMatchObject({ goal: 35 });
});
test('canceling a goal edit restores the summary', async () => {
  await mount('edit-me');
  await userEvent.press(screen.getByRole('button', { name: 'Edit goal' }));
  await fireEvent(screen.getByLabelText('Goal'), 'accessibilityAction', {
    nativeEvent: { actionName: 'increment' },
  });
  await userEvent.press(screen.getByRole('button', { name: 'Back' }));
  expect(screen.getByText('Spend 30 minutes at the gym')).toBeTruthy();
});
test('empty conditions offers creation', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('fresh-install');
  await render(
    <AppRuntimeProvider runtime={runtime}>
      <ConditionsScreen onAdd={leave} onEdit={leave} />
    </AppRuntimeProvider>,
  );
  expect(screen.getByText('Your first condition starts here')).toBeTruthy();
});
test('two mounted builders own independent draft transactions', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('fresh-install');
  const first = { ...toRule(createDraft('walking'), toSchedule(scheduleDraft({}))), id: 'first' };
  const second = { ...toRule(createDraft('gym'), toSchedule(scheduleDraft({}))), id: 'second' };
  rulesStore.getState().patch({ rules: [first, second] });
  await render(
    <AppRuntimeProvider runtime={runtime}>
      <ConditionBuilder id="first" onClose={leave} />
      <ConditionBuilder id="second" onClose={leave} />
    </AppRuntimeProvider>,
  );
  expect(screen.getByText('Walk 5,000 steps')).toBeTruthy();
  expect(screen.getByText('Spend 30 minutes at the gym')).toBeTruthy();
});

test('builder keeps the summary open and explains an unsupported full schedule', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('fresh-install');
  const existing = separatedRules(7);
  rulesStore.getState().patch({ rules: existing });
  await render(
    <AppRuntimeProvider runtime={runtime}>
      <ConditionBuilder onClose={leave} />
    </AppRuntimeProvider>,
  );

  await userEvent.press(screen.getByRole('radio', { name: 'Walking' }));
  await userEvent.press(screen.getByRole('button', { name: 'Continue' }));
  await userEvent.press(screen.getByRole('button', { name: 'Continue' }));
  await userEvent.press(screen.getByRole('radio', { name: 'Reach a step goal (Recommended)' }));
  await userEvent.press(screen.getByRole('button', { name: 'Continue' }));
  await userEvent.press(screen.getByRole('button', { name: 'Continue' }));
  await userEvent.press(screen.getByRole('button', { name: 'Continue' }));
  await userEvent.press(screen.getByRole('button', { name: 'Save condition' }));

  expect(screen.getByText(/This schedule cannot be saved exactly/)).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Save condition' })).toBeTruthy();
  expect(rulesStore.getState().data.rules).toEqual(existing);
});

test('toggle rejection is visible and leaves a paused condition unchanged', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('fresh-install');
  const rules = [...separatedRules(7), { ...separatedRules(1, false)[0], id: 'paused', schedule: { days: [0], window: { kind: 'range', startMinute: 420, endMinute: 450 } } } as Rule];
  rulesStore.getState().patch({ rules });
  await render(
    <AppRuntimeProvider runtime={runtime}>
      <ConditionsScreen onAdd={leave} onEdit={leave} />
    </AppRuntimeProvider>,
  );

  const pausedSwitch = screen
    .getAllByRole('switch', { name: 'Walk 5,000 steps' })
    .find((candidate) => candidate.props.value === false);
  expect(pausedSwitch).toBeTruthy();
  await fireEvent(pausedSwitch!, 'valueChange', true);

  expect(screen.getByText(/This schedule cannot be saved exactly/)).toBeTruthy();
  expect(rulesStore.getState().data.rules.find((rule) => rule.id === 'paused')?.enabled).toBe(false);
});
