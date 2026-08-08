import {
  act,
  fireEvent,
  renderRouter,
  screen,
  waitFor,
} from 'expo-router/testing-library';

const renderAt = (initialUrl: string) => renderRouter('./src/app', { initialUrl });

async function restorePurchase(outcome: 'restored' | 'none') {
  await fireEvent.press(screen.getByRole('button', { name: 'Restore purchases' }));
  await fireEvent.press(
    screen.getByRole('button', {
      name: outcome === 'restored'
        ? 'Preview restored purchase'
        : 'Preview nothing to restore',
    }),
  );
  expect(screen.getByText('Checking sample purchases…')).toBeTruthy();
  await act(() => jest.advanceTimersByTime(600));
}

describe('rendered paywall interaction seams', () => {
  it('repeats the selected plan CTA after the proof cards', async () => {
    const result = renderAt('/paywall');
    await result;

    expect(
      screen.getAllByRole('button', { name: 'Start 7-day free trial' }),
    ).toHaveLength(2);
  });

  it('shows monthly billing truth without the annual free-trial timeline', async () => {
    const result = renderAt('/paywall?plan=monthly');
    await result;

    expect(screen.getByText('A simple monthly timeline')).toBeTruthy();
    expect(screen.getByText('Monthly access begins at $9.99/month.')).toBeTruthy();
    expect(screen.getByText('Renews at $9.99/month until cancelled.')).toBeTruthy();
    expect(screen.queryByText('Your 7-day free trial begins.')).toBeNull();
    expect(screen.queryByText('The annual plan begins at $59.99/year.')).toBeNull();
    expect(screen.getAllByRole('button', { name: 'Continue monthly' })).toHaveLength(2);
  });

  it('carries the selected monthly plan through purchase success into post-purchase Signup', async () => {
    const result = renderAt('/paywall?plan=monthly');
    await result;

    await fireEvent.press(screen.getAllByRole('button', { name: 'Continue monthly' })[0]);
    expect(screen.getAllByText('$9.99/month').length).toBeGreaterThan(0);
    await fireEvent.press(screen.getByRole('button', { name: 'Subscribe' }));
    expect(screen.getByText('Preparing preview…')).toBeTruthy();
    expect(screen.getByRole('button', {
      name: 'Purchase preview in progress.',
    }).props.accessibilityState).toMatchObject({ busy: true, disabled: true });
    await act(() => jest.advanceTimersByTime(600));
    expect(screen.getByText('You’re all set.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Done' }));

    await waitFor(() => {
      expect(result.getPathname()).toBe('/signup');
      expect(result.getSearchParams()).toEqual({ mode: 'postPurchase' });
    });

    await fireEvent.press(screen.getByRole('button', { name: 'Continue with Apple' }));
    await act(() => jest.advanceTimersByTime(550));
    await fireEvent.press(screen.getByRole('button', { name: 'Start with Home' }));
    await fireEvent.press(screen.getByRole('tab', { name: 'Settings' }));
    expect(screen.getByText('Active · Renews Sep 7, 2026')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Manage Subscription' }));
    expect(screen.getByText(/Active · ExcerLock Premium · Monthly/)).toBeTruthy();
    expect(screen.getByText(/Renews Sep 7, 2026 · \$9.99\/month/)).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Change or cancel subscription' }));
    await fireEvent.press(screen.getByRole('button', { name: 'The subscription is too expensive.' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    await fireEvent.press(screen.getByRole('button', { name: 'No thanks' }));
    expect(screen.getByText(
      'Premium stays active through September 7, 2026. No App Store subscription changes.',
    )).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Confirm cancellation' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Done' }));
    expect(screen.getByText(/Cancelled · ExcerLock Premium · Monthly/)).toBeTruthy();
    expect(screen.getByText(/Access through Sep 7, 2026 · Will not renew/)).toBeTruthy();
  });

  it('lets a plan query initialize the choice without pinning later plan changes', async () => {
    const result = renderAt('/paywall?plan=monthly');
    await result;

    await fireEvent.press(screen.getByRole('button', { name: 'Annual, $59.99/year' }));
    expect(screen.getAllByRole('button', { name: 'Start 7-day free trial' })).toHaveLength(2);
    expect(screen.getByText('Your 7-day free trial begins.')).toBeTruthy();
  });

  it('offers a deterministic nothing-to-restore result after visible progress', async () => {
    const result = renderAt('/paywall');
    await result;

    await restorePurchase('none');

    expect(screen.getByText('Nothing to restore')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'OK' }));
    expect(result.getPathname()).toBe('/paywall');
  });

  it('routes an anonymous restored purchase through recovery identity', async () => {
    const result = renderAt('/paywall');
    await result;

    await restorePurchase('restored');
    expect(screen.getByText('Purchases restored')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => {
      expect(result.getPathname()).toBe('/signup');
      expect(result.getSearchParams()).toEqual({ mode: 'recovery' });
    });
  });

  it('lets a signed-in restored purchase finish directly on Home', async () => {
    const result = renderAt('/debug');
    await result;
    await fireEvent.press(screen.getByRole('button', { name: 'Signed-in demo profile' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Paywall · Annual' }));

    await restorePurchase('restored');
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => expect(result.getPathname()).toBe('/home'));
  });
});
