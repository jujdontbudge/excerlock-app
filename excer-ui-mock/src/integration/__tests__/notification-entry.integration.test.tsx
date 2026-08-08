import {
  fireEvent,
  renderRouter,
  screen,
  waitFor,
} from 'expo-router/testing-library';

async function expectLocation(
  result: ReturnType<typeof renderRouter>,
  pathname: string,
  searchParams: Record<string, string>,
) {
  await waitFor(() => {
    expect(result.getPathname()).toBe(pathname);
    expect(result.getSearchParams()).toEqual(searchParams);
  });
}

describe('rendered notification-entry seam', () => {
  it.each([
    ['nudge', '/home', { entry: 'nudge' }],
    ['last-call', '/home', { entry: 'lastCall' }],
  ] as const)('opens the %s preview directly on focused Home', async (slug, pathname, searchParams) => {
    const result = renderRouter('./src/app', { initialUrl: `/notification-preview/${slug}` });
    await result;

    await fireEvent.press(screen.getByRole('button', { name: 'Tap notification preview' }));

    await expectLocation(result, pathname, searchParams);
  });

  it('opens a fresh recap on empty Analysis and shares it with the canonical type query', async () => {
    const result = renderRouter('./src/app', { initialUrl: '/notification-preview/recap' });
    await result;

    await fireEvent.press(screen.getByRole('button', { name: 'Tap notification preview' }));

    await expectLocation(result, '/analysis', { entry: 'recap' });
    expect(screen.getByText(/FRESH WEEKLY RECAP/)).toBeTruthy();
    expect(screen.getByText('6h 20m reclaimed')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Share recap' }));

    await expectLocation(result, '/share-achievement', { type: 'recap' });
  });
});
