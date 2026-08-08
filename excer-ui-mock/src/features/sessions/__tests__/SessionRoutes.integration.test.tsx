import {
  act,
  fireEvent,
  renderRouter,
  screen,
  waitFor,
} from 'expo-router/testing-library';

async function seedShowcase(result: ReturnType<typeof renderRouter>) {
  await result;
  await fireEvent.press(screen.getByRole('button', { name: 'Seed showcase conditions' }));
  await waitFor(() => expect(result.getPathname()).toBe('/home'));
}

describe('condition-aware Home and session routes', () => {
  it('carries the selected Walk condition into the route and verifying Cancel returns Home', async () => {
    const result = renderRouter('./src/app', { initialUrl: '/debug' });
    await seedShowcase(result);

    await fireEvent.press(screen.getByRole('button', { name: 'Start walking for While walking' }));
    await waitFor(() => {
      expect(result.getPathname()).toBe('/walk-session');
      expect(result.getSearchParams()).toEqual({ conditionId: 'demo-walk' });
    });
    expect(screen.getByText('While walking')).toBeTruthy();
    expect(screen.getByText('Apps stay open while moving · balance drains normally · 2 min grace · 7:00 AM–10:00 PM')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Start walking' }));
    expect(screen.getByText('Finding your walking rhythm…')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(result.getPathname()).toBe('/home'));
    expect(result.getSearchParams()).toEqual({});
    expect(screen.getByText('Move first, scroll after.')).toBeTruthy();
  });

  it('returns Home when Cancel is pressed from the ready Gym phase', async () => {
    const result = renderRouter('./src/app', { initialUrl: '/debug' });
    await seedShowcase(result);

    await fireEvent.press(screen.getByRole('button', { name: 'Complete Go to gym' }));
    await waitFor(() => expect(result.getPathname()).toBe('/gym-check-in'));
    expect(screen.getByText('Check in for Go to gym.')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(result.getPathname()).toBe('/home'));
    expect(screen.getByText('Move first, scroll after.')).toBeTruthy();
  });

  it('keeps the Gym route and resets to ready when verifying Cancel is pressed', async () => {
    const result = renderRouter('./src/app', { initialUrl: '/debug' });
    await seedShowcase(result);

    await fireEvent.press(screen.getByRole('button', { name: 'Complete Go to gym' }));
    await waitFor(() => expect(result.getPathname()).toBe('/gym-check-in'));
    await fireEvent.press(screen.getByRole('button', { name: 'Check in' }));
    expect(screen.getByText('Checking Harbor Strength…')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));

    expect(result.getPathname()).toBe('/gym-check-in');
    expect(screen.getByText('Check in for Go to gym.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Check in' })).toBeTruthy();
  });

  it.each([
    ['Motion & Fitness, Allowed in demo', '/settings/permission/motion'],
    ['Location, Allowed in demo', '/settings/permission/location'],
  ] as const)('opens the %s ready row at its exact repair target', async (label, pathname) => {
    const result = renderRouter('./src/app', { initialUrl: '/walk-session?fixture=debug' });
    await result;

    await fireEvent.press(screen.getByRole('button', { name: label }));
    await waitFor(() => expect(result.getPathname()).toBe(pathname));
  });

  it('resets an ended-by-user session when Start again is pressed', async () => {
    const result = renderRouter('./src/app', { initialUrl: '/debug' });
    await result;
    await fireEvent.press(screen.getByRole('button', { name: 'Walk · Ended by user' }));
    await waitFor(() => expect(result.getPathname()).toBe('/walk-session'));

    await fireEvent.press(screen.getByRole('button', { name: 'Start again' }));
    expect(screen.getByText('Finding your walking rhythm…')).toBeTruthy();
  });

  it('resets an ended-stopped session from the Keep walking shield action', async () => {
    const result = renderRouter('./src/app', { initialUrl: '/debug' });
    await result;
    await fireEvent.press(screen.getByRole('button', { name: 'Walk · Ended after stop' }));
    await waitFor(() => expect(result.getPathname()).toBe('/walk-session'));

    await fireEvent.press(screen.getByRole('button', { name: 'Why did apps lock?' }));
    await fireEvent.press(screen.getByRole('button', { name: 'View lock moment' }));
    await waitFor(() => expect(result.getPathname()).toBe('/lock-moment/walk-ended'));
    await fireEvent.press(screen.getByRole('button', { name: 'Keep walking' }));
    await waitFor(() => expect(result.getPathname()).toBe('/walk-session'));
    expect(screen.getByText('Finding your walking rhythm…')).toBeTruthy();
  });

  it('returns View condition to Home and auto-opens that exact condition detail', async () => {
    const result = renderRouter('./src/app', { initialUrl: '/debug' });
    await seedShowcase(result);

    await fireEvent.press(screen.getByRole('button', { name: 'Complete Go to gym' }));
    await waitFor(() => {
      expect(result.getPathname()).toBe('/gym-check-in');
      expect(result.getSearchParams()).toEqual({ conditionId: 'demo-gym' });
    });
    expect(screen.getByText('Harbor Strength')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Check in' }));
    expect(screen.getByText('Harbor Strength · 100 m radius')).toBeTruthy();
    await act(() => jest.advanceTimersByTime(700));

    expect(screen.getByText('VERIFIED')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'View condition' }));
    await waitFor(() => {
      expect(result.getPathname()).toBe('/home');
      expect(result.getSearchParams()).toEqual({ conditionId: 'demo-gym' });
    });
    expect(screen.getByRole('header', { name: 'Go to gym' })).toBeTruthy();
    expect(screen.getByText('EVENT CONDITION')).toBeTruthy();
  });
});
