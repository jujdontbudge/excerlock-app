import { render, screen, userEvent } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { LegalScreen } from '../LegalScreen';
import { LegalHubScreen } from '../LegalHubScreen';

beforeEach(() => jest.clearAllMocks());
afterEach(() => jest.restoreAllMocks());

test.each([['privacy', 'Privacy Policy'], ['terms', 'Terms of Use']] as const)(
  '%s opens the canonical published document rather than placeholder copy', async (doc, title) => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    await render(<LegalScreen doc={doc} />);
    await userEvent.press(screen.getByRole('button', { name: `Read ${title}` }));
    expect(open).toHaveBeenCalledWith(`https://excerlock.com/${doc}`);
    expect(screen.queryByText(/Phase 1|remain on this device when you.*delete/i)).toBeNull();
  },
);

test('failed document opening is visible and retryable', async () => {
  const open = jest.spyOn(Linking, 'openURL').mockRejectedValueOnce(new Error('unavailable')).mockResolvedValue(undefined);
  await render(<LegalScreen doc="privacy" />);
  await userEvent.press(screen.getByRole('button', { name: 'Read Privacy Policy' }));
  expect(await screen.findByText('Could not open the document. Please try again.')).toBeTruthy();
  await userEvent.press(screen.getByRole('button', { name: 'Read Privacy Policy' }));
  expect(open).toHaveBeenCalledTimes(2);
  expect(screen.queryByText('Could not open the document. Please try again.')).toBeNull();
});

test('legal hub no longer advertises placeholder documents', async () => {
  await render(<LegalHubScreen navigate={jest.fn()} onBack={jest.fn()} />);
  expect(screen.queryByText(/placeholder/i)).toBeNull();
});
