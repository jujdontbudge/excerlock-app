export const paywallCopy = {
  eyebrow: "A plan built around movement",
  title: "ExcerLock Premium",
  body: "Build a screen-time plan that makes room for the workouts and walks you already want to do.",
  includedLink: "What’s included",
  cancellationNote: "Cancel anytime in the App Store.",
  restore: "Restore purchases",
  redeem: "Redeem code",
  terms: "Terms of Use",
  privacy: "Privacy Policy",
  prototypeDisclosure: "Prototype preview — no purchase will be made.",
} as const;

export const paywallPlans = [
  {
    id: "annual",
    label: "Annual",
    price: "$59.99/year",
    trial: "7 days free",
    badge: "7 DAYS FREE · SAVE 50%",
    cta: "Start 7-day free trial",
    renewal: "Then $59.99/year until cancelled.",
    equivalent: "$4.99/month",
    initiallySelected: true,
  },
  {
    id: "monthly",
    label: "Monthly",
    price: "$9.99/month",
    trial: null,
    badge: null,
    cta: "Continue monthly",
    renewal: "$9.99/month until cancelled.",
    equivalent: null,
    initiallySelected: false,
  },
] as const;

export const paywallTimelines = {
  annual: [
    { label: "Today", body: "Your 7-day free trial begins." },
    { label: "Day 7", body: "The annual plan begins at $59.99/year." },
    { label: "Anytime", body: "Cancel in the App Store." },
  ],
  monthly: [
    { label: "Today", body: "Monthly access begins at $9.99/month." },
    { label: "Each month", body: "Renews at $9.99/month until cancelled." },
    { label: "Anytime", body: "Cancel in the App Store." },
  ],
} as const;

export const paywallTimeline = paywallTimelines.annual;

export const premiumFeatures = [
  { id: "locked-apps", title: "One shared screen-time balance", body: "Keep the apps you choose in one clear group instead of managing a separate timer for each one." },
  { id: "conditions", title: "Ways to earn that fit your day", body: "Use gym visits, walking, steps, workouts, distance, or active effort as conditions." },
  { id: "analysis", title: "See the time you took back", body: "Review sample trends, streaks, earning sources, and milestones in one place." },
  { id: "schedules", title: "Rules for real life", body: "Set active days, rest days, lock windows, and planned days off." },
  { id: "verification", title: "Clear status and recovery", body: "See what a condition needs, what the demo detected, and how to repair a missing permission." },
] as const;

export const paywallProofCards = [
  "One balance. Many ways to earn.",
  "Rest days stay rest days.",
  "Your setup stays yours.",
] as const;

export const purchasePreview = {
  simulatedNative: true,
  product: "ExcerLock Premium",
  annualLine: "7 days free, then $59.99/year",
  monthlyLine: "$9.99/month",
  account: "j•••••@example.com",
  primary: "Subscribe",
  secondary: "Cancel",
  disclosure: "Prototype preview — no charge, subscription, or App Store action will occur.",
  processing: { cta: "Preparing preview…", accessibilityStatus: "Purchase preview in progress." },
  success: {
    title: "You’re all set.",
    body: "This demo has switched to the subscribed state. No purchase was made. One last step keeps the sample setup together.",
    action: "Done",
    nextRoute: "/signup?mode=postPurchase",
  },
  failure: {
    title: "Purchase didn’t finish.",
    body: "Nothing was charged in this prototype. Return to the plans and try the preview again.",
    actions: ["Try again", "Back to plans"],
  },
} as const;

export const restoreFixtures = {
  loading: { title: "Checking sample purchases…", body: "This is a local prototype state.", action: "Cancel" },
  restored: { title: "Purchases restored", body: "The subscribed demo state is ready. No App Store receipt was checked.", action: "Continue" },
  none: { title: "Nothing to restore", body: "No sample purchase is attached to this demo state.", action: "OK" },
} as const;

export const subscriptionFixtures = {
  trial: { status: "Free trial", plan: "ExcerLock Premium · Annual", accessThrough: "Trial ends Aug 14, 2026", renewal: "$59.99/year after the trial" },
  active: { status: "Active", plan: "ExcerLock Premium · Annual", accessThrough: "Renews Aug 7, 2027", renewal: "$59.99/year" },
  cancelled: { status: "Cancelled", plan: "ExcerLock Premium · Annual", accessThrough: "Access through Aug 14, 2026", renewal: "Will not renew" },
} as const;

export function getSubscriptionPresentation(
  status: keyof typeof subscriptionFixtures,
  selectedPlan: 'annual' | 'monthly' | null,
  offer: 'standard' | 'annual-winback' = 'standard',
) {
  if (selectedPlan !== 'monthly') {
    if (offer === 'annual-winback' && status !== 'trial') {
      return {
        status: status === 'cancelled' ? 'Cancelled' : 'Active',
        plan: 'ExcerLock Premium · Annual offer',
        accessThrough: status === 'cancelled'
          ? 'Access through Aug 7, 2027'
          : 'Renews Aug 7, 2027',
        renewal: status === 'cancelled' ? 'Will not renew' : '$29.99/year',
      } as const;
    }
    return subscriptionFixtures[status];
  }
  if (status === 'cancelled') {
    return {
      status: 'Cancelled',
      plan: 'ExcerLock Premium · Monthly',
      accessThrough: 'Access through Sep 7, 2026',
      renewal: 'Will not renew',
    } as const;
  }
  return {
    status: 'Active',
    plan: 'ExcerLock Premium · Monthly',
    accessThrough: 'Renews Sep 7, 2026',
    renewal: '$9.99/month',
  } as const;
}

export const subscriptionRows = [
  { label: "Change or cancel subscription", subtitle: "Review the sample plan and cancellation flow." },
  { label: "Restore purchases", subtitle: "Preview a restore result." },
  { label: "Redeem code", subtitle: "Preview the App Store handoff." },
  { label: "Help & FAQ", subtitle: "Billing and subscription answers." },
  { label: "Learn more", subtitle: "See what Premium includes." },
] as const;

export const cancellationFlow = {
  title: "What could work better?",
  body: "Choose the closest reason. This feedback stays in the current demo.",
  reasons: [
    "The subscription is too expensive.",
    "I’m not using ExcerLock enough.",
    "The earning rules don’t fit me.",
    "I had trouble with permissions or verification.",
    "Something else.",
  ],
  commentPlaceholder: "Tell us more, if you’d like.",
  characterCount: "0/180",
  disabledReason: "Choose a reason to continue.",
  winBack: {
    eyebrow: "A lower annual option",
    title: "Keep Premium for $29.99/year.",
    body: "Same Premium features and the same 7-day trial. No timer and no deadline in this preview.",
    primary: "Choose $29.99/year",
    secondary: "No thanks",
    renewal: "Then $29.99/year until cancelled.",
  },
  confirmation: {
    title: "Cancel the sample subscription?",
    trialBody: "Premium stays active through August 14, 2026. No App Store subscription changes.",
    activeBody: "Premium stays active through August 7, 2027. No App Store subscription changes.",
    monthlyBody: "Premium stays active through September 7, 2026. No App Store subscription changes.",
    actions: ["Keep Premium", "Confirm cancellation"],
  },
  result: {
    title: "Sample subscription cancelled",
    body: "The local fixture will not renew. No App Store subscription changed.",
    action: "Done",
  },
} as const;
