export const supportEmail = 'johansardar77@gmail.com';
/** Form labels stay on the device. Later server kinds are documented here only. */
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
  replyEmail: 'Reply email',
  replyEmailPlaceholder: 'you@example.com',
  replyEmailInvalid: 'Enter an email address so we can reply.',
  emailInstead: 'Email support instead',
  handedOff: 'Finish sending in Mail',
  handedOffBody: 'Mail has your message. Send it there to reach us.',
  errorWithAddress: `Something went wrong. Email ${supportEmail}`,
  sending: 'Sending…',
  sentBody: 'We read every one.',
  bugTitle: 'Found a bug?',
  bugSupport: 'Let us know what happened so we can fix it.',
  bugField: 'Describe the issue',
  bugPlaceholder: 'Tell us what went wrong…',
  bugSend: 'Send report',
  bugSent: 'Report sent',
  feedbackTitle: 'Feedback',
  feedbackSupport: 'Help us make ExcerLock the best it can be.',
  feedbackField: 'Your feedback',
  feedbackPlaceholder: 'Type here…',
  feedbackSend: 'Submit feedback',
  feedbackSent: 'Feedback sent',
  deviceInfo: 'Device info (auto-attached)',
  deviceModel: 'Model',
  deviceSystem: 'System',
  deviceApp: 'App version',
} as const;
