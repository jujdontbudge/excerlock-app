export const lowTimeNotice = {
  title: "10 minutes left",
  body: "A quick walk keeps your options open.",
  primary: "Earn more",
  secondary: "Dismiss",
} as const;

export const timeOutNotice = {
  title: "Time’s up—for now.",
  conditionBody: (conditionName: string) =>
    `${conditionName} is your quickest enabled way forward in this sample setup.`,
  primary: "Start walking",
  gymPrimary: "Check in",
  conditionPrimary: (conditionName: string) => `View ${conditionName}`,
  secondary: "See all ways to earn",
  tertiary: "Back home",
  empty: {
    body: "No enabled ways to earn are set up right now.",
    helper: "Head home to add or enable one when you’re ready.",
    primary: "Review Home",
  },
  unavailable: {
    body: "No ways to earn are available under the current rules right now.",
    helper: "Review Home to see today’s rules and when each condition becomes available.",
    primary: "Review Home",
  },
} as const;

export const shieldVariants = [
  {
    id: "balance-empty",
    surface: "shieldPreview",
    simulatedNative: true,
    title: "Time’s up—for now.",
    subtitle: "Open ExcerLock to see your quickest enabled way forward.",
    primary: "Open ExcerLock",
    secondary: "Close",
    forbidden: ["Balance", "spent-time", "streak", "countdown"],
    accessibilityLabel: "Apps are locked because today’s sample balance is empty.",
  },
  {
    id: "full-lock",
    surface: "shieldPreview",
    simulatedNative: true,
    title: "Move first, scroll after.",
    subtitle: "Open ExcerLock to see your quickest enabled way forward.",
    primary: "Open ExcerLock",
    secondary: "Close",
    forbidden: ["guilt", "failed", "specific gym", "location"],
    accessibilityLabel: "Apps are locked by the Full Lock sample rule.",
  },
  {
    id: "walk-ended",
    surface: "shieldPreview",
    simulatedNative: true,
    title: "You stopped walking.",
    subtitle: "Start walking again to pick up where you left off.",
    primary: "Keep walking",
    secondary: "Close",
    forbidden: ["balance drain was paused"],
    accessibilityLabel: "Apps are locked because the walking sample session ended with no balance.",
  },
  {
    id: "schedule",
    surface: "shieldPreview",
    simulatedNative: true,
    title: "Apps are asleep.",
    subtitle: "Back at 7:00 AM.",
    primary: "OK",
    secondary: null,
    forbidden: ["extra action", "earning pitch", "stale counter"],
    accessibilityLabel: "Apps are locked by the sample schedule until 7:00 AM.",
  },
] as const;

export const shieldPresentationContract = {
  background: "light ivory blur",
  lockPose: "closed clay lock",
  primaryColor: "blue",
  haptic: false,
  sound: false,
  disclosurePlacement: "debug/demo wrapper",
} as const;
