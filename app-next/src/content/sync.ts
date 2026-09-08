/**
 * Copy for the two places sync is visible: the one-off summary after a restore brought an account's
 * rules onto a device that had none, and the developer menu's view of the schedule. Nothing else in
 * the product mentions sync — backup is not a feature the user operates.
 */
export const syncCopy = {
  welcomeTitle: 'Welcome back',
  welcomeBody: ({ rules, history }: { rules: number; history: number }) => {
    const conditions = `${rules} ${rules === 1 ? 'condition' : 'conditions'}`;
    if (history === 0) return `We restored ${conditions} from your account.`;
    return `We restored ${conditions} and ${history} ${history === 1 ? 'day' : 'days'} of history from your account.`;
  },
  welcomeApps: 'Pick the apps to lock again — your app choice stays on the device it was made on.',
  welcomeAction: 'Continue',
  logTitle: 'Sync',
  logEmpty: 'Nothing to report yet',
  logPaused: 'Paused: sign in again to back up',
  lastPush: (at: string) => `Last backup ${at}`,
  neverPushed: 'Nothing backed up yet',
  clearLog: 'Clear sync log',
} as const;
