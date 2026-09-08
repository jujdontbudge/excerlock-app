import { render, screen, userEvent, fireEvent } from '@testing-library/react-native';
import { ConditionBuilder } from '../ConditionBuilder';
import { ConditionsScreen } from '../ConditionsScreen';
import { GymsScreen } from '../../settings/GymsScreen';
import { AppRuntimeProvider } from '../../../runtime/AppRuntimeProvider';
import { createRuntime } from '../../../runtime/createRuntime';
import { rulesStore } from '../../../state/rulesStore';
import { ruleDaysStore } from '../../../state/ruleDaysStore';
import { deleteRule } from '../mutations';
import { settingsStore } from '../../../state/settingsStore';
import { createDraft, toRule } from '../../rules/draft';
import { scheduleDraft, toSchedule } from '../../rules/scheduleDraft';
import { validateRule } from '../../../domain/validateRule';
import { Rule } from '../../../domain/types';
import { minuteLabel } from '../../../domain/scheduleLabel';
import { builderPath, editPath } from '../builderFlow';
import { conditionsCopy } from '../../../content/conditions';
import { planCopy } from '../../../content/plan';
import { controls } from '../../../content/controls';
import { settingsCopy } from '../../../content/settings';
import { MIN_WINDOW_MINUTES } from '../../../domain/ruleWindow';
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
async function mount(id?: string, seed?: Partial<Rule>) {
  const runtime = createRuntime();
  await runtime.dev.load('fresh-install');
  if (id)
    rulesStore.getState().patch({
          rules: [{ ...toRule(createDraft('running'), toSchedule(scheduleDraft({}))), id, ...(seed ?? {}) } as Rule],
    });
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
  await userEvent.press(screen.getByRole('button', { name: 'Continue' }));
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
  await userEvent.press(screen.getByRole('button', { name: 'Continue' }));
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

test('the gym path has no place step', () => {
  expect(builderPath({ ...createDraft('gym'), gymMode: 'time' })).toEqual(['O20', 'G1', 'G2', 'S1', 'S3']);
  expect(builderPath({ ...createDraft('gym'), gymMode: 'arrival' })).toEqual(['O20', 'G1', 'S1', 'S3']);
  expect(builderPath({ ...createDraft('gym'), gymMode: 'time' })).not.toContain('GPlace');
});

test('editPath walks the real branch from the chosen entry and stops before the schedule', () => {
  const gym = { ...createDraft('gym'), gymMode: 'time' as const };
  expect(editPath('O20', gym)).toEqual(['O20', 'G1', 'G2']);
  expect(editPath('G1', gym)).toEqual(['G1', 'G2']);
  expect(editPath('G1', { ...gym, gymMode: 'arrival' as const })).toEqual(['G1']);
  expect(editPath('S1', gym)).toEqual(['S1']);
});

test('every builder step has Back and Cancel', async () => {
  await mount();
  await userEvent.press(screen.getByRole('radio', { name: 'Gym' }));
  for (const step of ['O20', 'G1', 'G2', 'S1', 'S3']) {
    expect(screen.getByRole('button', { name: controls.back })).toBeTruthy();
    expect(screen.getByRole('button', { name: conditionsCopy.cancel })).toBeTruthy();
    const label = step === 'S3' ? conditionsCopy.save : conditionsCopy.continue;
    expect(screen.getByRole('button', { name: label })).toBeTruthy();
    if (step !== 'S3') await userEvent.press(screen.getByRole('button', { name: conditionsCopy.continue }));
  }
});

test('a 20-minute window is refused with the 30-minute copy', async () => {
  expect(MIN_WINDOW_MINUTES).toBe(30);
  await mount('edit-me', {
    schedule: { days: [1, 2, 3, 4, 5], window: { kind: 'range', startMinute: 540, endMinute: 560 } },
  });
  await userEvent.press(screen.getByRole('button', { name: planCopy.editSchedule }));
  expect(screen.getByText(planCopy.windowError)).toBeTruthy();
  expect(planCopy.windowError).toContain(String(MIN_WINDOW_MINUTES));
  expect(screen.getByRole('button', { name: conditionsCopy.continue })).toBeDisabled();
});

test('a gym rule saved with no gym is paused with a note', async () => {
  await mount();
  expect(settingsStore.getState().data.gymPlaces).toHaveLength(0);
  await userEvent.press(screen.getByRole('radio', { name: 'Gym' }));
  await userEvent.press(screen.getByRole('button', { name: conditionsCopy.continue }));
  await userEvent.press(screen.getByRole('radio', { name: 'Arrive at the gym' }));
  await userEvent.press(screen.getByRole('button', { name: conditionsCopy.continue }));
  await userEvent.press(screen.getByRole('button', { name: conditionsCopy.continue }));
  expect(screen.getByText(`${planCopy.noGym} · ${planCopy.addGym}`)).toBeTruthy();
  await userEvent.press(screen.getByRole('button', { name: conditionsCopy.save }));
  const saved = rulesStore.getState().data.rules[0];
  expect(saved.enabled).toBe(false);
  expect(saved.pausedReason).toBe('noGym');
});

test('adding a gym from the summary adds a second gym and never edits the last one', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('fresh-install');
  await runtime.gym.savePlace({
    id: 'golds',
    name: "Gold's Gym",
    address: '1 Main St',
    latitude: 40,
    longitude: -80,
    radiusMeters: 100,
  });
  await render(
    <AppRuntimeProvider runtime={runtime}>
      <GymsScreen onBack={leave} />
    </AppRuntimeProvider>,
  );
  await userEvent.press(screen.getByRole('button', { name: settingsCopy.addGym }));
  await userEvent.press(screen.getByRole('button', { name: 'Save gym' }));
  const places = runtime.gym.listPlaces();
  expect(places).toHaveLength(2);
  expect(places.find((p) => p.id === 'golds')).toMatchObject({ name: "Gold's Gym", latitude: 40 });
});

test('deleting the last gym pauses the gym conditions and saving a gym re-enables them', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('fresh-install');
  await runtime.gym.savePlace({
    id: 'golds',
    name: "Gold's Gym",
    address: '1 Main St',
    latitude: 40,
    longitude: -80,
    radiusMeters: 100,
  });
  const gymRule = { ...toRule(createDraft('gym'), toSchedule(scheduleDraft({}))), id: 'gym-rule' };
  rulesStore.getState().patch({ rules: [gymRule] });
  await render(
    <AppRuntimeProvider runtime={runtime}>
      <GymsScreen onBack={leave} />
    </AppRuntimeProvider>,
  );
  await userEvent.press(screen.getByRole('button', { name: `${settingsCopy.removeGym}: Gold's Gym` }));
  expect(screen.getByText(settingsCopy.removeGymTitle("Gold's Gym"))).toBeTruthy();
  expect(screen.getByText(settingsCopy.removeGymBody(1))).toBeTruthy();
  await userEvent.press(screen.getByRole('button', { name: settingsCopy.removeGym }));
  expect(rulesStore.getState().data.rules[0]).toMatchObject({ enabled: false, pausedReason: 'noGym' });
  await userEvent.press(screen.getByRole('button', { name: settingsCopy.addGym }));
  await userEvent.press(screen.getByRole('button', { name: 'Save gym' }));
  expect(rulesStore.getState().data.rules[0]).toMatchObject({ enabled: true });
  expect(rulesStore.getState().data.rules[0].pausedReason ?? null).toBeNull();
});

test('editing the mode shows the new goal screen before the summary', async () => {
  await mount('edit-me', { activity: 'gym', mode: { kind: 'event', activity: 'gym', trigger: 'arrival' } });
  await userEvent.press(screen.getByRole('button', { name: planCopy.editGoal }));
  expect(screen.getByText('What counts at the gym?')).toBeTruthy();
  await userEvent.press(screen.getByRole('radio', { name: 'Spend time at the gym' }));
  await userEvent.press(screen.getByRole('button', { name: conditionsCopy.continue }));
  expect(screen.getByText('How long at the gym?')).toBeTruthy();
  await userEvent.press(screen.getByRole('button', { name: conditionsCopy.continue }));
  expect(screen.getByText(planCopy.S3)).toBeTruthy();
  await userEvent.press(screen.getByRole('button', { name: conditionsCopy.save }));
  expect(rulesStore.getState().data.rules).toHaveLength(1);
  expect(rulesStore.getState().data.rules[0].mode).toMatchObject({ kind: 'target', metric: 'minutes', goal: 30 });
});

test('changing the activity keeps the rule id', async () => {
  await mount('edit-me');
  const before = rulesStore.getState().data.rules[0];
  await userEvent.press(screen.getByRole('button', { name: planCopy.editActivity }));
  await userEvent.press(screen.getByRole('radio', { name: 'Biking' }));
  await userEvent.press(screen.getByRole('button', { name: conditionsCopy.continue }));
  expect(screen.getByText('What counts as a bike ride?')).toBeTruthy();
  await userEvent.press(screen.getByRole('button', { name: conditionsCopy.continue }));
  await userEvent.press(screen.getByRole('button', { name: conditionsCopy.continue }));
  expect(screen.getByText(planCopy.S3)).toBeTruthy();
  await userEvent.press(screen.getByRole('button', { name: conditionsCopy.save }));
  const rules = rulesStore.getState().data.rules;
  expect(rules).toHaveLength(1);
  expect(rules[0].id).toBe(before.id);
  expect(rules[0].createdAt).toBe(before.createdAt);
  expect(rules[0].activity).toBe('biking');
});

test('the summary says blocking starts as soon as you save when the window covers now', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('fresh-install');
  runtime.dev.setTime('2026-09-07T19:00:00.000Z', 'UTC');
  rulesStore.getState().patch({
    rules: [
      {
        ...toRule(createDraft('running'), { days: [0, 1, 2, 3, 4, 5, 6], window: { kind: 'range', startMinute: 540, endMinute: 1260 } }),
        id: 'now-rule',
      },
    ],
  });
  await render(
    <AppRuntimeProvider runtime={runtime}>
      <ConditionBuilder id="now-rule" onClose={leave} />
    </AppRuntimeProvider>,
  );
  expect(screen.getByText(planCopy.startsNow)).toBeTruthy();
  expect(screen.getByText(planCopy.toUnlock('Run 20 minutes'))).toBeTruthy();
});

test('the summary names the start time when the window is still ahead', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('fresh-install');
  runtime.dev.setTime('2026-09-07T07:00:00.000Z', 'UTC');
  rulesStore.getState().patch({
    rules: [
      {
        ...toRule(createDraft('running'), { days: [0, 1, 2, 3, 4, 5, 6], window: { kind: 'range', startMinute: 540, endMinute: 1260 } }),
        id: 'later-rule',
      },
    ],
  });
  await render(
    <AppRuntimeProvider runtime={runtime}>
      <ConditionBuilder id="later-rule" onClose={leave} />
    </AppRuntimeProvider>,
  );
  expect(screen.getByText(planCopy.startsAt(minuteLabel(540)))).toBeTruthy();
});

test('a walking condition shows no Gyms row', async () => {
  await mount('edit-me', {
    activity: 'walking',
    mode: { kind: 'target', activity: 'walking', metric: 'steps', goal: 5000, place: 'outside' },
  });
  expect(screen.queryByText(planCopy.gyms)).toBeNull();
  expect(screen.getByText(planCopy.places.outside)).toBeTruthy();
});

test('the conditions list shows the auto-pause reason on the row', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('fresh-install');
  rulesStore.getState().patch({
    rules: [
      {
        ...toRule(createDraft('gym'), toSchedule(scheduleDraft({}))),
        id: 'paused-gym',
        enabled: false,
        pausedReason: 'noGym',
      },
    ],
  });
  await render(
    <AppRuntimeProvider runtime={runtime}>
      <ConditionsScreen onAdd={leave} onEdit={leave} />
    </AppRuntimeProvider>,
  );
  expect(screen.getByText(conditionsCopy.statusNoGym)).toBeTruthy();
});

test('deleting a met condition keeps the unlock it earned today', () => {
  const now = '2026-09-07T15:00:00.000Z';
  const rule = { ...toRule(createDraft('running'), toSchedule(scheduleDraft({}))), id: 'met-rule' };
  rulesStore.getState().patch({ rules: [rule] });
  ruleDaysStore.getState().patch({
    days: [
      { ruleId: 'met-rule', day: '2026-09-07', progress: 20, met: true, metAt: now },
      { ruleId: 'met-rule', day: '2026-09-06', progress: 20, met: true, metAt: '2026-09-06T15:00:00.000Z' },
    ],
    walkingSession: null,
  });
  deleteRule('met-rule', now, 'UTC');
  expect(rulesStore.getState().data.rules).toHaveLength(0);
  expect(ruleDaysStore.getState().data.days).toEqual([
    { ruleId: 'met-rule', day: '2026-09-07', progress: 20, met: true, metAt: now },
  ]);
});
