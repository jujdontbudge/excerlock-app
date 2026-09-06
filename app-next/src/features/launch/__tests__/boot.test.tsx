import { renderRouter, screen } from 'expo-router/testing-library';
import Boot from '../../../../app/index';
test('the root route mounts the boot surface', async () => {
  await renderRouter({ index: Boot }, { initialUrl: '/' });
  expect(await screen.findByTestId('boot')).toBeTruthy();
});
test('boot exposes the app identity to assistive technology', async () => {
  await renderRouter({ index: Boot }, { initialUrl: '/' });
  expect(screen.getByRole('image', { name: 'ExcerLock' })).toBeTruthy();
});
