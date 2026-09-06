import {
  act,
  fireEvent,
  renderRouter,
  screen,
  waitFor,
} from 'expo-router/testing-library';
import { router } from 'expo-router';

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

describe('rendered Analysis route compliance', () => {
  it('keeps exact comparison choices separate from period navigation', async () => {
    const result = renderRouter('./src/app', {
      initialUrl: '/analysis/trend/time-reclaimed?fixture=showcase',
    });
    await result;

    expect(screen.getByText('Aug 3–9')).toBeTruthy();
    expect(screen.getByLabelText(/From Monday through Friday/)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Previous period' }));
    expect(screen.getByText('Jul 27–Aug 2')).toBeTruthy();
    expect(screen.getByLabelText(/Jul 27–Aug 2 sample reclaimed time totals/)).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: /Compared with/ }));
    for (const option of ['None', 'Steps', 'Workout minutes', 'Conditions completed', 'Unlock time used', 'Blocked attempts']) {
      expect(screen.getByRole('button', { name: new RegExp(`^${option}`) })).toBeTruthy();
    }
    await fireEvent.press(screen.getByRole('button', { name: /^Workout minutes/ }));
    expect(screen.getByLabelText('Sample comparison series for Workout minutes')).toBeTruthy();

    await fireEvent.press(screen.getByRole('radio', { name: 'Month' }));
    expect(screen.getByText('August 2026')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Next period' }));
    expect(screen.getByText('September 2026')).toBeTruthy();
    expect(screen.getByText('No sample data yet for September 2026.')).toBeTruthy();
    expect(screen.getByLabelText('No sample reclaimed-time data for September 2026')).toBeTruthy();
  });

  it('keeps natural-empty trend and earning details truthful', async () => {
    const result = renderRouter('./src/app', { initialUrl: '/analysis/trend/time-reclaimed' });
    await result;

    expect(screen.getByText('LOCAL ACTIVITY')).toBeTruthy();
    expect(screen.getByText('0 min of Time Locked is recorded in this local sample.')).toBeTruthy();
    expect(screen.getByText('0 min Time Locked')).toBeTruthy();
    expect(screen.queryByText(/11h 13m/)).toBeNull();
    expect(screen.queryByText('SAMPLE DATA')).toBeNull();

    await act(() => router.push('/analysis/earning'));
    await waitFor(() => expect(result.getPathname()).toBe('/analysis/earning'));

    expect(screen.getByText('LOCAL ACTIVITY')).toBeTruthy();
    expect(screen.getByText('0 min earned today')).toBeTruthy();
    expect(screen.getByText('No qualifying earning activity is recorded yet.')).toBeTruthy();
    expect(screen.queryByText('3h 46m banked this week')).toBeNull();
    expect(screen.queryByText('SAMPLE DATA')).toBeNull();
  });

  it('formats the requested day and opens earning for the exact fired condition', async () => {
    const result = renderRouter('./src/app', { initialUrl: '/debug' });
    await result;

    await fireEvent.press(screen.getByRole('button', { name: /Seed showcase conditions/ }));
    await waitFor(() => expect(result.getPathname()).toBe('/home'));
    await act(() => router.push('/analysis/day/2026-08-06'));
    await waitFor(() => expect(result.getPathname()).toBe('/analysis/day/2026-08-06'));

    expect(screen.getByRole('header', { name: 'Thursday, Aug 6' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Open Go to gym earning detail' }));

    await expectLocation(result, '/analysis/earning', { condition: 'demo-gym' });
    expect(screen.queryByText(/Selected from day detail/)).toBeNull();
  });

  it('starts the cheapest real local condition from an unmet current day', async () => {
    const result = renderRouter('./src/app', { initialUrl: '/debug' });
    await result;

    await fireEvent.press(screen.getByRole('button', { name: /Seed showcase conditions/ }));
    await waitFor(() => expect(result.getPathname()).toBe('/home'));

    await act(() => router.push('/analysis/day/2026-08-07?kind=missed'));
    await expectLocation(result, '/analysis/day/2026-08-07', { date: '2026-08-07', kind: 'missed' });
    await fireEvent.press(screen.getByRole('button', { name: 'Start today' }));

    await expectLocation(result, '/walk-session', { conditionId: 'demo-walk' });
  });

  it('opens an exact saved condition detail from an earning row', async () => {
    const result = renderRouter('./src/app', { initialUrl: '/debug' });
    await result;

    await fireEvent.press(screen.getByRole('button', { name: /Seed showcase conditions/ }));
    await waitFor(() => expect(result.getPathname()).toBe('/home'));
    await act(() => router.push('/analysis/earning'));
    await waitFor(() => expect(result.getPathname()).toBe('/analysis/earning'));

    await fireEvent.press(screen.getByRole('button', { name: 'Open Steps exchange condition detail' }));

    await expectLocation(result, '/home', { conditionId: 'demo-steps' });
    expect(await screen.findByRole('header', { name: 'Steps exchange' })).toBeTruthy();
  });

  it('carries badge-specific identity into a complete local iOS share simulation', async () => {
    const result = renderRouter('./src/app', {
      initialUrl: '/analysis/badge/time-reclaimed-50-hours?fixture=unlocked',
    });
    await result;

    expect(screen.getByRole('header', { name: '50 hours reclaimed' })).toBeTruthy();
    expect(screen.getByText('50 hours reclaimed was unlocked in August 2026.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Share' }));
    await expectLocation(result, '/share-achievement', {
      badgeId: 'time-reclaimed-50-hours',
      type: 'milestone',
    });

    expect(screen.getByLabelText('Achievement preview thumbnail, 50h, 50 hours reclaimed, August 2026')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Share' }));

    expect(screen.getAllByLabelText('Achievement preview thumbnail, 50h, 50 hours reclaimed, August 2026')).toHaveLength(2);
    for (const label of ['AirDrop', 'Messages', 'Mail', 'Copy', 'Save to Files', 'Print']) {
      expect(screen.getByRole('button', { name: label })).toBeTruthy();
    }
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Mail' }));
    expect(screen.getByText('Shared')).toBeTruthy();
    expect(screen.getByText('Shared via Mail · local prototype only')).toBeTruthy();
    await waitFor(
      () => expect(screen.queryByRole('header', { name: 'iOS share preview' })).toBeNull(),
      { timeout: 1600 },
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Share' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('header', { name: 'iOS share preview' })).toBeNull();
  });
});
