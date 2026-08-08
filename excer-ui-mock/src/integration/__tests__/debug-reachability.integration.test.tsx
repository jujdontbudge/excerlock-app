import { Alert } from 'react-native';
import {
  act,
  fireEvent,
  renderRouter,
  screen,
  waitFor,
} from 'expo-router/testing-library';

const renderDebug = () => renderRouter('./src/app', { initialUrl: '/debug' });

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

describe('hidden debug reachability seam', () => {
  it('exposes every required fixture row and protects Reset all with a native confirmation', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const result = renderDebug();
    await result;

    const requiredRows = [
      'Restart onboarding',
      'Paywall · Annual',
      'Signup · Post-purchase choice',
      'Natural first Home',
      'Seed showcase conditions',
      'Locked showcase',
      'Unlocked · 30 min',
      'Low · 10 min',
      'Unlimited allowance',
      'Unlocked for today',
      'Unlocked until 8:30 PM',
      'No limits today · Rest day',
      'Outside lock window',
      ...['Ready', 'Verifying', 'Active', 'Paused', 'Grace', 'Ended by user', 'Ended after stop', 'Permission lost'].map((phase) => `Walk · ${phase}`),
      ...['Ready', 'Verifying', 'Verified', 'Failed'].map((phase) => `Gym · ${phase}`),
      'Empty history',
      'Populated sample history',
      'New badge · 50 hours reclaimed',
      'Needs attention',
      'All ready',
      'Free trial',
      'Active',
      'Cancelled · Access remains',
      'Post-purchase · Not saved',
      'Signed-in demo profile',
      'Signed out · Setup kept',
      ...['Fifth unlock', 'Seven days', 'Thirty days'].flatMap((trigger) =>
        ['Eligible', 'Presented', 'Dismissed', 'Rated', 'Shield-suppressed'].map((state) => `${trigger} · ${state}`),
      ),
      'Stopped after three presentations',
      ...['Afternoon nudge', 'Weekly recap', 'Streak last-call'].flatMap((kind) =>
        ['Unopened', 'Tapped'].map((phase) => `${kind} · ${phase}`),
      ),
      'Balance empty',
      'Full Lock',
      'Time out',
      'Walk ended',
      'Schedule',
    ];

    for (const title of requiredRows) expect(screen.getByText(title)).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Reset all demo state' }));
    expect(alertSpy).toHaveBeenCalledWith(
      'Reset every demo state?',
      'The prototype will return to Splash with first-run fixtures.',
      expect.arrayContaining([
        expect.objectContaining({ style: 'cancel', text: 'Cancel' }),
        expect.objectContaining({ style: 'destructive', text: 'Reset all' }),
      ]),
    );
    alertSpy.mockRestore();
  });

  it.each([
    ['Signed out · Setup kept', '/settings/account', { section: 'account' }, 'Sign in to restore your setup'],
    ['Empty history', '/analysis', { fixture: 'empty' }, 'Your first reclaimed hour will appear here.'],
    ['Cancelled · Access remains', '/settings/subscription', { fixture: 'cancelled', section: 'subscription' }, /Cancelled · ExcerLock Premium/],
    ['Thirty days · Shield-suppressed', '/settings/review', { fixture: 'suppressed', section: 'review', trigger: 'thirtyDays' }, 'Waiting after a shield'],
    ['Weekly recap · Tapped', '/notification-preview/recap', { kind: 'recap', phase: 'tapped' }, 'WEEKLY RECAP PREVIEW'],
    ['Schedule', '/lock-moment/schedule', { kind: 'schedule' }, 'Apps are asleep.'],
    ['Time out', '/lock-moment/time-out', { kind: 'time-out' }, 'No enabled ways to earn are set up right now.'],
  ] as const)('routes %s to its visible target', async (row, pathname, params, visibleCopy) => {
    const result = renderDebug();
    await result;
    await fireEvent.press(screen.getByRole('button', { name: row }));
    await expectLocation(result, pathname, params);
    expect(screen.getByText(visibleCopy)).toBeTruthy();
  });

  it.each([
    ['Purchase preview · Loading', '/paywall', { fixture: 'loading', plan: 'annual' }, 'Purchase preview in progress.'],
    ['Signup · Processing', '/signup', { fixture: 'processing', mode: 'postPurchase' }, 'Continue with Apple'],
  ] as const)('opens the frozen %s fixture', async (row, pathname, params, buttonName) => {
    const result = renderDebug();
    await result;
    await fireEvent.press(screen.getByRole('button', { name: row }));
    await expectLocation(result, pathname, params);
    expect(screen.getByRole('button', { name: buttonName }).props.accessibilityState).toMatchObject({ busy: true });
  });

  it('keeps the debug Walk verifying phase from auto-advancing', async () => {
    const result = renderDebug();
    await result;
    await fireEvent.press(screen.getByRole('button', { name: 'Walk · Verifying' }));
    await expectLocation(result, '/walk-session', { fixture: 'debug' });
    expect(screen.getByText('Finding your walking rhythm…')).toBeTruthy();
    await act(() => jest.advanceTimersByTime(1_000));
    expect(screen.getByText('Finding your walking rhythm…')).toBeTruthy();
  });
});
