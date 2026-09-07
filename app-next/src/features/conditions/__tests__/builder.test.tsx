import { render, screen, userEvent, fireEvent } from '@testing-library/react-native';
import { ConditionBuilder } from '../ConditionBuilder';
import { ConditionsScreen } from '../ConditionsScreen';
import { AppRuntimeProvider } from '../../../runtime/AppRuntimeProvider';
import { createRuntime } from '../../../runtime/createRuntime';
import { rulesStore } from '../../../state/rulesStore';
import { createDraft, toRule } from '../../rules/draft';
import { scheduleDraft, toSchedule } from '../../rules/scheduleDraft';
import { validateRule } from '../../../domain/validateRule';
const leave = jest.fn();
jest.mock('../../sheets/GymPicker', () => ({
  GymPicker: ({ open, onSaved, onDismiss }: { open: boolean; onSaved?: () => void; onDismiss: () => void }) => {
    const { GymPickerScreen } = require('../../gym-picker/GymPickerScreen');
    return open ? (
      <GymPickerScreen
        onSaved={() => {
          onSaved?.();
          onDismiss();
        }}
        onClose={onDismiss}
      />
    ) : null;
  },
}));
async function mount(id?: string) {
  const runtime = createRuntime();
  await runtime.dev.load('fresh-install');
  if (id)
    rulesStore.getState().patch({ rules: [{ ...toRule(createDraft('running'), toSchedule(scheduleDraft({}))), id }] });
  await render(
    <AppRuntimeProvider runtime={runtime}>
      <ConditionBuilder id={id} onClose={leave} />
    </AppRuntimeProvider>,
  );
  return runtime;
}
test.each([
  ['Walking', 'Reach a step goal', 2],
  ['Gym', 'Spend time at the gym', 1],
  ['Gym', 'Arrive at the gym', 0],
  ['Running', 'Run for a set time', 1],
  ['Biking', 'Bike a set distance', 1],
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
  await fireEvent.changeText(screen.getByLabelText('Goal'), '35');
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
test('canceling an invalid goal edit restores the summary', async () => {
  await mount('edit-me');
  await userEvent.press(screen.getByRole('button', { name: 'Edit goal' }));
  await fireEvent.changeText(screen.getByLabelText('Goal'), '');
  await userEvent.press(screen.getByRole('button', { name: 'Back' }));
  expect(screen.getByText('Run 20 minutes')).toBeTruthy();
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
  const first = { ...toRule(createDraft('running'), toSchedule(scheduleDraft({}))), id: 'first' };
  const second = { ...toRule(createDraft('biking'), toSchedule(scheduleDraft({}))), id: 'second' };
  rulesStore.getState().patch({ rules: [first, second] });
  await render(
    <AppRuntimeProvider runtime={runtime}>
      <ConditionBuilder id="first" onClose={leave} />
      <ConditionBuilder id="second" onClose={leave} />
    </AppRuntimeProvider>,
  );
  expect(screen.getByText('Run 20 minutes')).toBeTruthy();
  expect(screen.getByText('Bike 30 minutes')).toBeTruthy();
});
