import { screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { HomeScreen } from '../HomeScreen';
import { AppRuntimeProvider } from '../../../runtime/AppRuntimeProvider';
import { createRuntime } from '../../../runtime/createRuntime';
import { profileStore } from '../../../state/profileStore';

test('Home is headed ExcerLock, whatever the user is called', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('walk-state-ready');
  profileStore.getState().patch({ name: 'Alex' });
  await renderRouter({
    _layout: () => <AppRuntimeProvider runtime={runtime}><HomeScreen /></AppRuntimeProvider>,
    index: () => null,
  });
  expect((await screen.findByText('ExcerLock', { includeHiddenElements: true })).props.accessibilityRole).toBe('header');
  expect(screen.queryByText(/Hello,|Your day/, { includeHiddenElements: true })).toBeNull();
  // No section heading over the condition cards.
  expect(screen.queryByText('Conditions', { includeHiddenElements: true })).toBeNull();
  runtime.dispose();
});
