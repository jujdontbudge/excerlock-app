import { act, screen, userEvent } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { AppRuntimeProvider } from '../../../runtime/AppRuntimeProvider';
import { createRuntime } from '../../../runtime/createRuntime';
import { emptyPermissions, permissionsStore } from '../../../state/permissionsStore';
import { rulesStore } from '../../../state/rulesStore';
import { settingsStore } from '../../../state/settingsStore';
import { draftFromAnswers } from '../../rules/answersDraft';
import { toRule } from '../../rules/draft';
import { scheduleDraft, toSchedule } from '../../rules/scheduleDraft';
import { SetupFlow } from '../SetupFlow';
import type { Answers } from '../../../onboarding/types';

const gymPlace = {
  id: 'gym-1',
  name: 'West Loop Fitness',
  address: '123 N Morgan St, Chicago',
  latitude: 41.884,
  longitude: -87.652,
  radiusMeters: 100,
};

jest.mock('../../../motion/haptics', () => ({ feedback: jest.fn() }));
const settle = () =>
  act(async () => {
    for (let i = 0; i < 4; i++) await Promise.resolve();
  });

/**
 * Every condition onboarding can create, straight from its answers, gets exactly the screens it
 * needs after the paywall, and allowing each one leaves it with everything it needs.
 */
test.each([
  [
    'walking · step goal',
    { activity: 'walking', walkingMode: 'steps' },
    ['Choose apps to lock', 'Count your steps'],
    { motion: 'granted' },
  ],
  [
    'walking · minutes',
    { activity: 'walking', walkingMode: 'minutes' },
    ['Choose apps to lock', 'Count your steps'],
    { motion: 'granted' },
  ],
  [
    'walking · unlock while walking',
    { activity: 'walking', walkingMode: 'state' },
    ['Choose apps to lock', 'Count your steps', 'Unlock apps as you walk'],
    { motion: 'granted', location: 'always' },
  ],
  [
    'gym · arrive',
    { activity: 'gym', gymMode: 'arrival' },
    ['Choose apps to lock', 'Know when you are at the gym', 'Pick your gym'],
    { location: 'whenInUse' },
  ],
  [
    'gym · be there',
    { activity: 'gym', gymMode: 'presence' },
    ['Choose apps to lock', 'Know when you are at the gym', 'Pick your gym'],
    { location: 'whenInUse' },
  ],
  [
    'gym · time',
    { activity: 'gym', gymMode: 'time' },
    ['Choose apps to lock', 'Know when you are at the gym', 'Pick your gym'],
    { location: 'whenInUse' },
  ],
] as const)('%s asks for exactly what it needs', async (_name, answers, titles, granted) => {
  const runtime = createRuntime();
  await runtime.dev.load('fresh-install');
  runtime.dev.setPromptMode('grant');
  const rule = toRule(draftFromAnswers(answers as Answers), toSchedule(scheduleDraft({})));
  rulesStore.getState().patch({ rules: [rule], lockedApps: { handle: null, isEmpty: true } });
  permissionsStore.getState().patch(emptyPermissions);
  settingsStore.getState().patch({ gymPlaces: [] });
  const onDone = jest.fn();
  const rendered = renderRouter({
    _layout: () => (
      <AppRuntimeProvider runtime={runtime}>
        <SetupFlow account={false} onDone={onDone} />
      </AppRuntimeProvider>
    ),
    index: () => null,
    'gym-picker': () => null,
  });
  await rendered;
  const seen: string[] = [];
  for (const title of titles) {
    expect(screen.getByRole('header', { name: title })).toBeTruthy();
    seen.push(title);
    if (title === 'Choose apps to lock') {
      await userEvent.press(screen.getByRole('button', { name: 'Continue' }));
      await settle();
      await act(async () => {
        runtime.dev.resolvePrompt({ handle: { token: 'opaque-fake' }, isEmpty: false });
        for (let i = 0; i < 4; i++) await Promise.resolve();
      });
    } else if (title === 'Pick your gym') {
      await userEvent.press(screen.getByRole('button', { name: 'Choose gym' }));
      expect(rendered.getPathname()).toBe('/gym-picker');
      // Saving a gym in the picker is what clears this step.
      await act(async () => settingsStore.getState().patch({ gymPlaces: [gymPlace] }));
    } else {
      await userEvent.press(screen.getByRole('button', { name: 'Continue' }));
      await settle();
    }
  }
  expect(seen).toEqual(titles);
  expect(onDone).toHaveBeenCalledTimes(1);
  expect(permissionsStore.getState().data).toMatchObject({ screenTime: 'granted', ...granted });
  // Nothing a condition does not use is asked for.
  if (!('motion' in granted)) expect(permissionsStore.getState().data.motion).toBe('notDetermined');
  if (!('location' in granted)) expect(permissionsStore.getState().data.location).toBe('notDetermined');
  expect(permissionsStore.getState().data.camera).toBe('notDetermined');
  runtime.dispose();
});
