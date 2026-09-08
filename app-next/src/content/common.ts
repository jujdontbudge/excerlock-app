export const common = {
  appName: 'ExcerLock',
  offline: "You're offline. Connect and try again — this will not retry on its own.",
  persistenceNotice: {
    unreadable: 'Some saved data could not be read after the last update.',
    unsaved: 'A recent change could not be saved. Try it again.',
    dismiss: 'Dismiss',
  },
  errorTitle: 'Something went wrong',
  errorBody: 'ExcerLock hit a problem drawing this screen. Your conditions and progress are safe.',
  errorAction: 'Back to Home',
} as const;
