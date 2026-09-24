import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { ConditionBuilder } from '../ConditionBuilder';
import { ConditionsScreen } from '../ConditionsScreen';
import { AppRuntimeProvider } from '../../../runtime/AppRuntimeProvider';
import { createRuntime } from '../../../runtime/createRuntime';
import { emptyPermissions, permissionsStore } from '../../../state/permissionsStore';
import { rulesStore } from '../../../state/rulesStore';
import { makeRule } from '../../../demo/scenarios/base';
import type { Permissions } from '../../../domain/types';

jest.mock('../../../motion/haptics', () => ({ feedback: jest.fn() }));
const granted: Permissions = { ...emptyPermissions, screenTime: 'granted', motion: 'granted', location: 'always' };

async function mountBuilder(permissions: Partial<Permissions>) {
  const runtime = createRuntime();
  await runtime.dev.load('fresh-install');
  permissionsStore.getState().patch({ ...granted, ...permissions });
  rulesStore.getState().patch({ lockedApps: { handle: null, isEmpty: false } });
  const onClose = jest.fn(), onNeeds = jest.fn();
  await render(
    <AppRuntimeProvider runtime={runtime}>
      <ConditionBuilder onClose={onClose} onNeeds={onNeeds} />
    </AppRuntimeProvider>,
  );
  await userEvent.press(screen.getByRole('radio', { name: 'Walking' }));
  await userEvent.press(screen.getByRole('button', { name: 'Continue' }));
  await userEvent.press(screen.getByRole('button', { name: 'Continue' }));
  await userEvent.press(screen.getByRole('radio', { name: 'Reach a step goal' }));
  for (let i = 0; i < 3; i++) await userEvent.press(screen.getByRole('button', { name: 'Continue' }));
  await userEvent.press(screen.getByRole('button', { name: 'Save condition' }));
  return { onClose, onNeeds };
}

test('saving a condition that needs a permission opens the permission screens', async () => {
  const { onClose, onNeeds } = await mountBuilder({ motion: 'notDetermined' });
  expect(rulesStore.getState().data.rules).toHaveLength(1);
  expect(onNeeds).toHaveBeenCalledTimes(1);
  expect(onClose).not.toHaveBeenCalled();
});

test('saving a condition with everything on just closes', async () => {
  const { onClose, onNeeds } = await mountBuilder({});
  expect(onNeeds).not.toHaveBeenCalled();
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('turning a condition back on asks for what it needs', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('fresh-install');
  permissionsStore.getState().patch({ ...granted, location: 'notDetermined' });
  rulesStore.getState().patch({
    rules: [{ ...makeRule('gym', { kind: 'state', activity: 'gym' }), enabled: false }],
    lockedApps: { handle: null, isEmpty: false },
  });
  const onNeeds = jest.fn();
  await render(
    <AppRuntimeProvider runtime={runtime}>
      <ConditionsScreen onAdd={() => {}} onEdit={() => {}} onNeeds={onNeeds} />
    </AppRuntimeProvider>,
  );
  const menu = screen.getAllByRole('button').find((button) => /More actions for/.test(button.props.accessibilityLabel ?? ''))!;
  await userEvent.press(menu);
  await userEvent.press(screen.getByRole('button', { name: 'Turn on' }));
  await waitFor(() => expect(rulesStore.getState().data.rules[0]!.enabled).toBe(true));
  expect(onNeeds).toHaveBeenCalledTimes(1);
});
