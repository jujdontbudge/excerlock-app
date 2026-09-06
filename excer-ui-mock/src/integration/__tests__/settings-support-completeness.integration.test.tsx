import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';

const renderAt = (initialUrl: string) => renderRouter('./src/app', { initialUrl });

describe('Settings support, diagnostics, About, and legal completion seams', () => {
  it('keeps the Help hub and articles on a local light browser surface', async () => {
    const result = renderAt('/support/help');
    await result;

    expect(screen.getByTestId('support-hub-light')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Search help'), 'gym');
    expect(screen.getByText('Why couldn’t the gym check-in verify?')).toBeTruthy();
    expect(screen.queryByText('How earning adds time')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Why couldn’t the gym check-in verify?' }));
    expect(screen.getByTestId('support-article-light')).toBeTruthy();
    expect(screen.getByText('help.excerlock.local/gym')).toBeTruthy();
    expect(screen.getByText('What to check')).toBeTruthy();
  });

  it('returns composer success Done to the Support hub', async () => {
    const result = renderAt('/support/help');
    await result;

    await fireEvent.press(screen.getByRole('button', { name: 'Contact support' }));
    await fireEvent.changeText(
      screen.getByLabelText('What can we help with?'),
      'Please explain this sample lock state.',
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Send preview' }));
    expect(screen.getByRole('button', { name: 'Send preview' }).props.accessibilityState.busy).toBe(true);
    await act(() => jest.advanceTimersByTime(650));
    expect(screen.getByText('Thanks for the detail.')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Done' }));
    expect(screen.getByText('Hi there. How can we help?')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Contact support' }));
    expect(screen.getByLabelText('What can we help with?')).toBeTruthy();
  });

  it('returns composer success Back to the Support hub', async () => {
    const result = renderAt('/support/contact');
    await result;

    await fireEvent.changeText(screen.getByLabelText('What can we help with?'), 'A second local question.');
    await fireEvent.press(screen.getByRole('button', { name: 'Send preview' }));
    await act(() => jest.advanceTimersByTime(650));
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));

    expect(screen.getByText('Hi there. How can we help?')).toBeTruthy();
  });

  it('prepares diagnostics before success and completes a simulated share result', async () => {
    const result = renderAt('/support/diagnostics');
    await result;

    await fireEvent.press(screen.getByRole('button', { name: 'Prepare sample bundle' }));
    expect(screen.getByText('Preparing sample bundle…')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Preparing status-only fields' }).props.accessibilityState.busy).toBe(true);
    await act(() => jest.advanceTimersByTime(650));
    expect(screen.getByText('Sample bundle ready')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Share bundle preview' }));
    expect(screen.getByText('Share preview')).toBeTruthy();
    expect(screen.getByText('ExcerLock-Diagnostics.txt')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Messages' }));
    expect(screen.getByText('Share preview complete')).toBeTruthy();
    expect(screen.getByText(/Messages was selected locally/)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Close share preview' }));
    expect(screen.getByText('Sample bundle ready')).toBeTruthy();
  });

  it('renders About build identity, simulates Share ExcerLock, and opens Debug on tap seven', async () => {
    const result = renderAt('/settings/about');
    await result;

    expect(screen.getByText('ExcerLock 1.0.0 (100) · Prototype')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Share ExcerLock' }));
    expect(screen.getByText('Share preview')).toBeTruthy();
    expect(screen.getByText('ExcerLock — Workout to Unlock')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Mail' }));
    expect(screen.getByText('Share preview complete')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Close share preview' }));

    const footer = screen.getByRole('button', { name: 'About version. Tap seven times for local debug entry' });
    for (let index = 0; index < 7; index += 1) await fireEvent.press(footer);
    expect(screen.getByText('Demo states')).toBeTruthy();
  });

  it('discloses the Apple Health manual-entry rule', async () => {
    const result = renderAt('/settings/apple-health');
    await result;
    expect(screen.queryByText('Manually typed entries would not count.')).toBeNull();
  });

  it('changes legal document typography in Reader mode', async () => {
    const result = renderAt('/legal/terms');
    await result;

    const standardBody = screen.getByTestId('legal-opening-body');
    const standardFontSize = Array.isArray(standardBody.props.style)
      ? standardBody.props.style.flat().filter(Boolean).at(-1)?.fontSize ?? standardBody.props.style.flat().filter(Boolean)[0]?.fontSize
      : standardBody.props.style.fontSize;

    await fireEvent.press(screen.getByRole('button', { name: 'Reader' }));
    const readerBody = screen.getByTestId('legal-opening-body');
    const readerFontSize = Array.isArray(readerBody.props.style)
      ? readerBody.props.style.flat().filter(Boolean).at(-1)?.fontSize
      : readerBody.props.style.fontSize;
    expect(readerFontSize).toBeGreaterThan(standardFontSize);
    expect(screen.getByRole('button', { name: 'Exit Reader' })).toBeTruthy();
  });
});
