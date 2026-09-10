/** Canonical published documents, also linked from the purchase flow. */
export const legalCopy = {
  privacy: { title: 'Privacy Policy', url: 'https://excerlock.com/privacy', action: 'Read Privacy Policy' },
  terms: { title: 'Terms of Use', url: 'https://excerlock.com/terms', action: 'Read Terms of Use' },
  description: 'Read the current document on excerlock.com. Opens in your browser and requires an internet connection.',
  openError: 'Could not open the document. Please try again.',
} as const;
