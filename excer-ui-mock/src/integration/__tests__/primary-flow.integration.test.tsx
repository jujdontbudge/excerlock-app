import {
  act,
  fireEvent,
  renderRouter,
  screen,
  waitFor,
} from 'expo-router/testing-library';

async function expectPathname(result: ReturnType<typeof renderRouter>, pathname: string) {
  await waitFor(() => expect(result.getPathname()).toBe(pathname));
}

describe('primary rendered navigation seam', () => {
  it('moves from onboarding through signup to empty Home and all four tabs', async () => {
    const result = renderRouter('./src/app', { initialUrl: '/onboarding/value' });
    await result;
    const press = (label: string) => fireEvent.press(screen.getAllByLabelText(label)[0]);
    const pressTimes = async (label: string, count: number) => {
      for (let index = 0; index < count; index += 1) await press(label);
    };

    expect(screen.getByText('Earn your screen time.')).toBeTruthy();
    await press('Next');
    await expectPathname(result, '/onboarding/confession');

    await pressTimes('Increase', 5);
    expect(screen.getByText('5 hours')).toBeTruthy();
    await press('Next');
    await expectPathname(result, '/onboarding/mirror');

    await press('Take some back');
    await expectPathname(result, '/onboarding/privacy');
    await press('I accept');
    await expectPathname(result, '/onboarding/screen-time');

    await press('Continue');
    await press('Allowed in demo');
    await expectPathname(result, '/onboarding/apps');

    expect(screen.getByLabelText('Loop, selected')).toBeTruthy();
    await press('Done');
    await expectPathname(result, '/onboarding/motion');

    for (const step of ['health', 'location'] as const) {
      await press('Allow');
      await press('Allowed in demo');
      await expectPathname(result, `/onboarding/${step}`);
    }
    await press('Allow');
    await press('Allowed in demo');
    await expectPathname(result, '/onboarding/allowance');

    await pressTimes('Increase', 10);
    expect(screen.getByLabelText('Daily free allowance, zero through four hours in five minute steps'))
      .toHaveAccessibilityValue({ now: 45, text: '45 min' });
    await press('Done');
    await expectPathname(result, '/onboarding/review');
    await press('Looks good');
    await expectPathname(result, '/onboarding/done');
    await press('See plans');
    await expectPathname(result, '/paywall');

    await press('Start 7-day free trial');
    await press('Subscribe');
    await act(() => jest.advanceTimersByTime(600));
    await press('Done');
    await expectPathname(result, '/signup');

    await press('Continue with Apple');
    await act(() => jest.advanceTimersByTime(550));
    await press('Start with Home');
    await expectPathname(result, '/home');
    expect(screen.getByText('Add your first way to earn')).toBeTruthy();

    for (const tab of ['Manage', 'Analysis', 'Settings', 'Home'] as const) {
      await fireEvent.press(screen.getByRole('tab', { name: tab }));
      await expectPathname(result, `/${tab.toLowerCase()}`);
    }

    await press('Add condition');
    await expectPathname(result, '/condition-builder');
    await press('Arrive at gym');
    expect(screen.getByText('No saved gyms yet')).toBeTruthy();
    await press('Add a sample gym');
    await expectPathname(result, '/gym/new');
    await press('Save gym');
    await expectPathname(result, '/condition-builder');
    await press('Sample Gym 1');
    await press('Next');
    await press('Next');
    await press('Add a fixed amount');
    await pressTimes('Increase minutes added', 6);
    await press('Once');
    await press('4 hours');
    await press('No');
    await press('Anytime');
    await press('Next');
    await press('Weights floor');
    await press('Next');
    await press('Save condition');
    await expectPathname(result, '/home');
    expect(screen.getByText('Go to gym')).toBeTruthy();
    expect(screen.getByText('0 min earned today')).toBeTruthy();
    expect(screen.getByText('Today’s goal is ready')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'No streak yet; active day.' })).toBeTruthy();
    expect(screen.queryByText('2h 05m earned today')).toBeNull();

    await fireEvent.press(screen.getByRole('tab', { name: 'Analysis' }));
    await expectPathname(result, '/analysis');
    expect(screen.getByText('Your first insight starts with one active day.')).toBeTruthy();
    expect(screen.queryByTestId('weekly-recap-card')).toBeNull();

    await fireEvent.press(screen.getByRole('tab', { name: 'Home' }));
    await expectPathname(result, '/home');
    await fireEvent.press(screen.getByRole('button', { name: 'Complete Go to gym' }));
    await expectPathname(result, '/gym-check-in');
    await fireEvent.press(screen.getByRole('button', { name: 'Check in' }));
    await act(() => jest.advanceTimersByTime(700));
    await fireEvent.press(screen.getByRole('button', { name: 'Done' }));
    await expectPathname(result, '/home');
    expect(screen.getByText('Adding 30 min')).toBeTruthy();
    await act(() => jest.advanceTimersByTime(900));
    expect(screen.getByText('30 min earned today')).toBeTruthy();

    await fireEvent.press(screen.getByRole('tab', { name: 'Analysis' }));
    await expectPathname(result, '/analysis');
    expect(screen.getByText('Your real local sample has started.')).toBeTruthy();
    expect(screen.getAllByText('1 qualifying activity recorded across 1 day.').length).toBeGreaterThan(0);
    expect(screen.queryByText('18h 42m')).toBeNull();
    expect(screen.queryByTestId('weekly-recap-card')).toBeNull();

    await fireEvent.press(screen.getByLabelText('2026-08-07. Active day met by a event condition.'));
    await expectPathname(result, '/analysis/day/2026-08-07');
    expect(screen.getByText('Qualifying activity')).toBeTruthy();
    expect(screen.getAllByText('1 qualifying min').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Open Go to gym earning detail' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    await expectPathname(result, '/analysis');

    await fireEvent.press(screen.getByRole('button', { name: 'Open Time Reclaimed trend' }));
    await expectPathname(result, '/analysis/trend/time-reclaimed');
    expect(screen.getByText('LOCAL ACTIVITY')).toBeTruthy();
    expect(screen.getByText('0 min of Time Locked is recorded in this local sample.')).toBeTruthy();
    expect(screen.queryByText(/11h 13m/)).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    await expectPathname(result, '/analysis');

    await fireEvent.press(screen.getByRole('button', { name: 'Open earning breakdown' }));
    await expectPathname(result, '/analysis/earning');
    expect(screen.getByText('30 min earned today')).toBeTruthy();
    expect(screen.getByText('Go to gym')).toBeTruthy();
    expect(screen.queryByText('3h 46m banked this week')).toBeNull();
  });
});
