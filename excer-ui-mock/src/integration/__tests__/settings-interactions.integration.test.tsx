import {
  act,
  fireEvent,
  renderRouter,
  screen,
  waitFor,
} from 'expo-router/testing-library';

const renderAt = (initialUrl: string) => renderRouter('./src/app', { initialUrl });

describe('rendered Settings interaction seams', () => {
  it('gates only the first notification enable behind benefit and permission previews', async () => {
    const result = renderAt('/settings/notifications');
    await result;
    const nudge = screen.getByRole('switch', { name: 'Afternoon nudge' });

    await fireEvent(nudge, 'valueChange', true);
    expect(screen.getByText('Get one helpful nudge')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByText('Allow ExcerLock notifications in this demo?')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Not now' }));
    expect(screen.getByRole('switch', { name: 'Afternoon nudge' }).props.value).toBe(false);

    await fireEvent(screen.getByRole('switch', { name: 'Afternoon nudge' }), 'valueChange', true);
    expect(screen.getByRole('switch', { name: 'Afternoon nudge' }).props.value).toBe(true);
    expect(screen.queryByText('Get one helpful nudge')).toBeNull();

    await fireEvent.press(
      screen.getByRole('button', { name: 'Afternoon nudge time, 3:00 PM' }),
    );
    await fireEvent.press(screen.getByRole('button', { name: '4:00 PM' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByRole('button', { name: 'Afternoon nudge time, 4:00 PM' })).toBeTruthy();

    await fireEvent(screen.getByRole('switch', { name: 'Weekly recap' }), 'valueChange', true);
    expect(screen.getByRole('switch', { name: 'Weekly recap' }).props.value).toBe(true);
  });

  it('enables the pending notification after the simulated Allow outcome', async () => {
    const result = renderAt('/settings/notifications');
    await result;

    await fireEvent(
      screen.getByRole('switch', { name: 'Streak last-call' }),
      'valueChange',
      true,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Allow in demo' }));

    expect(screen.getByRole('switch', { name: 'Streak last-call' }).props.value).toBe(true);
  });

  it('shows a distinct iOS Settings sheet before marking a permission healthy', async () => {
    const result = renderAt('/settings/permission/location');
    await result;
    await fireEvent.press(screen.getByRole('button', { name: 'Open iOS Settings preview' }));
    expect(screen.getByText('SIMULATED IOS SETTINGS · NO SYSTEM PAGE')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Allow in demo' }));
    expect(screen.getByRole('button', { name: 'Mark as not asked in demo' })).toBeTruthy();
  });

  it('adds and removes shortcuts through simulated sheets and confirmation', async () => {
    const result = renderAt('/settings/shortcuts');
    await result;
    await fireEvent.press(screen.getByRole('button', { name: 'Start walking' }));
    expect(screen.getByText('SIMULATED ADD TO SIRI SHEET')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Add shortcut in demo' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Done' }));
    expect(screen.getAllByText('Added')).toHaveLength(2);

    await fireEvent.press(screen.getByRole('button', { name: 'Start walking' }));
    expect(screen.getByText('Remove Start walking?')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Remove in demo' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Done' }));
    expect(screen.getAllByText('Added')).toHaveLength(1);
  });

  it('commits a custom day boundary only after Done', async () => {
    const result = renderAt('/settings/day-boundary');
    await result;
    await fireEvent.press(screen.getByRole('button', { name: 'Custom' }));
    await fireEvent.press(screen.getByRole('button', { name: '5:00 AM' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Done' }));
    expect(screen.getByText('5:00 AM')).toBeTruthy();
    expect(screen.getByText('Custom day boundary saved at 5:00 AM.')).toBeTruthy();
  });

  it('persists appearance, week-start, units, and day-boundary summaries after child routes close', async () => {
    const result = renderAt('/settings/general');
    await result;

    await fireEvent.press(screen.getByRole('button', { name: 'Appearance' }));
    expect(screen.getByLabelText('Auto appearance preview')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Light' }));
    expect(screen.getByLabelText('Light appearance preview')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByText('Light')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Start week on' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Monday' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByText('Monday')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Units' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Kilometers' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByText('Kilometers')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Day boundary' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Custom' }));
    await fireEvent.press(screen.getByRole('button', { name: '5:00 AM' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Done' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByText('5:00 AM')).toBeTruthy();
  });

  it('persists Sounds and presents Language as a distinct simulated iOS sheet', async () => {
    const result = renderAt('/settings/general');
    await result;

    const sounds = screen.getByRole('switch', { name: 'Sounds' });
    expect(sounds.props.value).toBe(false);
    await fireEvent(sounds, 'valueChange', true);
    expect(screen.getByRole('switch', { name: 'Sounds' }).props.value).toBe(true);

    await fireEvent.press(screen.getByRole('button', { name: 'Language' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Open Settings preview' }));
    expect(screen.getByText('SIMULATED IOS SETTINGS')).toBeTruthy();
    expect(screen.getByText('Preferred Language')).toBeTruthy();
    expect(screen.getByText('English (US) · ✓')).toBeTruthy();
  });

  it('previews exports and protects reset and deletion with local confirmations', async () => {
    const result = renderAt('/settings/data');
    await result;
    await fireEvent.press(screen.getByRole('button', { name: 'Export conditions' }));
    expect(screen.getByText('Export preview ready')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Preview share' }));
    expect(screen.getByText('SIMULATED SHARE SHEET')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Done' }));

    await fireEvent.press(screen.getByRole('button', { name: 'Reset demo data' }));
    expect(screen.getByText('Reset demo data?')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Delete all local data' }));
    expect(screen.getByText('Delete all local demo data?')).toBeTruthy();
  });

  it('runs cancel, win-back, cancelled, and subscribe-again states locally', async () => {
    const result = renderAt('/settings/subscription');
    await result;
    await fireEvent.press(screen.getByRole('button', { name: 'Change or cancel subscription' }));
    await fireEvent.press(screen.getByRole('button', { name: 'The subscription is too expensive.' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByText('Keep Premium for $29.99/year.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'No thanks' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Confirm cancellation' }));
    expect(screen.getByText('Sample subscription cancelled')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Done' }));
    expect(screen.getByText(/Cancelled · ExcerLock Premium/)).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Change or cancel subscription' }));
    expect(screen.getByText('Subscribe again')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Monthly · $9.99/month' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Done' }));
    expect(screen.getByText(/Active · ExcerLock Premium · Monthly/)).toBeTruthy();
    expect(screen.getByText(/Renews Sep 7, 2026 · \$9.99\/month/)).toBeTruthy();
  });

  it('persists the accepted lower-price win-back as an annual offer', async () => {
    const result = renderAt('/settings/subscription');
    await result;
    await fireEvent.press(screen.getByRole('button', { name: 'Change or cancel subscription' }));
    await fireEvent.press(screen.getByRole('button', { name: 'The subscription is too expensive.' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Choose $29.99/year' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Done' }));

    expect(screen.getByText(/Active · ExcerLock Premium · Annual offer/)).toBeTruthy();
    expect(screen.getByText(/Renews Aug 7, 2027 · \$29.99\/year/)).toBeTruthy();
  });

  it('offers deterministic subscription restore results with visible progress', async () => {
    const result = renderAt('/settings/subscription');
    await result;
    await fireEvent.press(screen.getByRole('button', { name: 'Restore purchases' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Preview nothing to restore' }));
    expect(screen.getByText('Checking sample purchases…')).toBeTruthy();
    await act(() => jest.advanceTimersByTime(600));
    expect(screen.getByText('Nothing to restore')).toBeTruthy();
  });

  it('runs Apple Health diagnostics, disconnect confirmation, and reconnect preview', async () => {
    const result = renderAt('/settings/apple-health');
    await result;
    await fireEvent.press(screen.getByRole('button', { name: 'Run diagnostics' }));
    expect(screen.getByText('Diagnostics complete')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Done' }));

    await fireEvent.press(screen.getByRole('button', { name: 'Disconnect Apple Health demo' }));
    expect(screen.getByText('Disconnect the Apple Health demo?')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Disconnect in demo' }));
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Reconnect Apple Health demo' }),
      ).toBeTruthy(),
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Reconnect Apple Health demo' }));
    expect(screen.getByText('SIMULATED HEALTH PERMISSION SHEET')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Reconnect in demo' }));
    expect(screen.getByText('Connected in demo')).toBeTruthy();
  });
});
