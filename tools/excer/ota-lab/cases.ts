export type LabCase = { name: string; title: string; variant: string; mode?: 'normal' | 'never' | 'cutoff' | 'corrupt' | 'rollback' | 'offline' | 'unavailable'; delayMs?: number;
  landAt?: string; activity?: 'walking' | 'gym'; until?: string; holdPage?: boolean; interruption?: 'background' | 'kill' | 'network'; rapid?: boolean; second?: string;
  action?: 'purchase' | 'restore' | 'setup' | 'permission'; returning?: boolean; transition?: boolean; verifySetup?: boolean; foregroundAtTerminal?: boolean; legacy?: boolean };

const pageNames: Record<string, string> = { O01: 'Welcome', O07: 'the gender question', O23: 'the muscle follow-up', O24: 'the fat follow-up', W2: 'the Walking Condition choice', G1: 'the Gym Condition choice', S3b: 'the Condition demo', S3c: 'the trial preview', S3d: 'the reminder', P: 'the Paywall', X1: 'Setup', 'sign-in': 'Sign in' };

export const cases: LabCase[] = [
  { name: 'first-fast', title: 'Install and open while the update arrives before three seconds', variant: 'copy', until: 'O01' },
  { name: 'first-held', title: 'Install and open while the update arrives between three and eight seconds', variant: 'copy', delayMs: 4500, until: 'O01' },
  { name: 'first-late', title: 'Install and open while the update finishes near the first-open deadline', variant: 'copy', delayMs: 6500, until: 'O01' },
  { name: 'first-never', title: 'Install and open while the download never completes', variant: 'copy', mode: 'never', until: 'O01' },
  { name: 'first-offline', title: 'Install and open while the update connection fails', variant: 'copy', mode: 'offline', until: 'O01' },
  { name: 'first-unavailable', title: 'Install and open while the update server returns service unavailable', variant: 'copy', mode: 'unavailable', until: 'O01' },
  { name: 'first-slow', title: 'Install and open while the download takes fifteen seconds', variant: 'copy', delayMs: 15000, until: 'O01' },
  ...['O01', 'O07', 'O23', 'O24', 'W2', 'G1', 'S3b', 'S3c', 'S3d'].map((page): LabCase => ({
    name: `same-${page.toLowerCase()}`, title: `Continue from ${pageNames[page]} after a copy update arrives`, variant: 'copy', landAt: page,
    activity: page === 'G1' ? 'gym' : 'walking', until: 'P',
  })),
  { name: 'visual', title: 'Continue after a visual update arrives', variant: 'visual', landAt: 'O07', until: 'P' },
  ...['added-page', 'removed-follow-up', 'changed-branch', 'renamed-page'].map((variant): LabCase => ({
    name: variant, title: `Finish onboarding after an update with ${variant.replaceAll('-', ' ')} arrives`, variant,
    landAt: variant === 'changed-branch' ? 'G1' : 'O10', activity: variant === 'changed-branch' ? 'gym' : 'walking',
    until: variant === 'changed-branch' ? 'location' : 'motion', action: 'setup', verifySetup: true,
  })),
  ...['P', 'X1', 'sign-in'].map((page): LabCase => ({ name: `never-${page.toLowerCase()}`, title: `Stay on ${pageNames[page]} while an update arrives`,
    variant: 'copy', landAt: page, until: page === 'X1' ? 'screenTime' : page, holdPage: true, ...(page === 'X1' ? { action: 'setup' as const } : {}) })),
  { name: 'never-purchase', title: 'Start a purchase while an update arrives', variant: 'copy', landAt: 'purchase', action: 'purchase', until: 'P', holdPage: true },
  { name: 'never-restore', title: 'Restore purchases while an update arrives', variant: 'copy', landAt: 'restore', action: 'restore', until: 'P', holdPage: true },
  { name: 'never-permission', title: 'Keep the notification permission prompt open while an update arrives', variant: 'copy', landAt: 'permission', action: 'permission', until: 'S3d', holdPage: true },
  { name: 'never-partway', title: 'Stay partway through a question while an update arrives', variant: 'copy', landAt: 'O07', until: 'O07', holdPage: true },
  { name: 'never-home', title: 'Finish Setup and return to Home while an update arrives', variant: 'copy', landAt: 'home', until: 'home', action: 'setup', holdPage: true, foregroundAtTerminal: true },
  { name: 'rapid', title: 'Tap Continue repeatedly as a copy update arrives', variant: 'copy', landAt: 'O07', until: 'P', rapid: true },
  { name: 'transition', title: 'Tap Get started during page entry while an update arrives', variant: 'copy', landAt: 'O02', until: 'P', rapid: true, transition: true },
  { name: 'cutoff', title: 'Open while the update download is cut off halfway', variant: 'copy', mode: 'cutoff', until: 'O01' },
  { name: 'corrupt', title: 'Open while the update has a corrupt asset', variant: 'copy', mode: 'corrupt', until: 'O01' },
  { name: 'crash', title: 'Open an update that crashes before its first content', variant: 'crash', until: 'O01' },
  { name: 'crash-mid', title: 'Continue a question into an update that crashes before its first content', variant: 'crash', landAt: 'O07', until: 'P' },
  { name: 'two-updates', title: 'Continue while two updates arrive back to back', variant: 'copy', second: 'visual', landAt: 'O07', until: 'P' },
  { name: 'rollback', title: 'Reopen after a rollback directive to embedded code', variant: 'copy', mode: 'rollback', until: 'O01' },
  ...(['background', 'kill', 'network'] as const).map((interruption): LabCase => ({ name: interruption, title: `Resume onboarding after ${interruption}`,
    variant: 'copy', landAt: 'O23', interruption, until: 'P' })),
  { name: 'returning', title: 'Reopen an existing install during a slow update download', variant: 'copy', mode: 'never', until: 'O01', returning: true },
  { name: 'analytics', title: 'Finish onboarding and view the Paywall once on the new update', variant: 'copy', landAt: 'O07', until: 'P' },
  { name: 'analytics-embedded', title: 'Finish onboarding offline and record the first embedded Paywall view', variant: 'copy', mode: 'never', until: 'P' },
  { name: 'analytics-legacy', title: 'Reopen an older install and keep its Paywall view out of the new-install count', variant: 'copy', mode: 'never', returning: true, legacy: true, until: 'P' },
];
