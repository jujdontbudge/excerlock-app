export const supportEmail = 'johansardar77@gmail.com';
export const supportServerCategory = {
  Problem: 'bug',
  Question: 'support',
  Idea: 'support',
} as const;
export const supportMailtoLimit = 1800;
export const supportSubject = (category: keyof typeof supportServerCategory) => `[ExcerLock] ${category}`;
export const supportDeviceFooter = (version: string, build: string, ios: string | number) =>
  `ExcerLock ${version} (${build}) · iOS ${ios}`;
export const supportCopy = {
  done: 'Done',
  replyEmail: 'Reply email',
  replyEmailPlaceholder: 'you@example.com',
  replyEmailInvalid: 'Enter an email address so we can reply.',
  emailInstead: 'Email support instead',
  handedOff: 'Finish sending in Mail',
  handedOffBody: 'Mail has your message. Send it there to reach us.',
  errorWithAddress: `Something went wrong. Email ${supportEmail}`,
  sending: 'Sending…',
  sentBody: 'We read every one.',
  feedbackTitle: 'Feedback',
  feedbackSupport: 'Help us make ExcerLock the best it can be.',
  feedbackField: 'Your feedback',
  feedbackPlaceholder: 'Type here…',
  feedbackSend: 'Submit feedback',
  feedbackSent: 'Feedback sent',
} as const;
