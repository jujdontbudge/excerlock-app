import { render, screen, userEvent } from '@testing-library/react-native';
import { ConditionsScreen } from '../ConditionsScreen';
import { AppRuntimeProvider } from '../../../runtime/AppRuntimeProvider';
import { createRuntime } from '../../../runtime/createRuntime';
import { rulesRetirementNote, rulesStore } from '../../../state/rulesStore';
test('the retirement note shows once on Conditions and dismissing clears it for good', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('fresh-install');
  rulesStore.getState().patch({ migrationNote: rulesRetirementNote });
  await render(
    <AppRuntimeProvider runtime={runtime}>
      <ConditionsScreen onAdd={() => {}} onEdit={() => {}} />
    </AppRuntimeProvider>,
  );
  expect(screen.getByText(rulesRetirementNote)).toBeTruthy();
  await userEvent.press(screen.getByRole('button', { name: 'Dismiss' }));
  expect(screen.queryByText(rulesRetirementNote)).toBeNull();
  expect(rulesStore.getState().data.migrationNote).toBeNull();
  runtime.dispose();
});
test('no banner without a note', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('fresh-install');
  rulesStore.getState().patch({ migrationNote: null });
  await render(
    <AppRuntimeProvider runtime={runtime}>
      <ConditionsScreen onAdd={() => {}} onEdit={() => {}} />
    </AppRuntimeProvider>,
  );
  expect(screen.queryByRole('button', { name: 'Dismiss' })).toBeNull();
  runtime.dispose();
});
