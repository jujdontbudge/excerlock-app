import type { NotificationEntryKind, PermissionStatus } from "./types";

export const settingsPermissionPanels = {
  attention: {
    title: "Permissions health",
    status: "1 needs attention",
    body: "Location needs a quick check. Everything else looks ready or optional.",
    action: "Review permissions",
  },
  healthy: {
    title: "Permissions health",
    status: "All ready",
    body: "Every permission is marked healthy in this demo state.",
    action: "Review permissions",
  },
} as const;

export const settingsRootSections = [
  {
    id: "account",
    title: "ACCOUNT",
    rows: [
      { id: "account", label: "Account", subtitle: "jordan@example.com", route: "/settings/account" },
      { id: "subscription", label: "Manage Subscription", subtitle: "Free trial · Ends Aug 14, 2026", route: "/settings/subscription" },
      { id: "notifications", label: "Notifications", subtitle: "All off", route: "/settings/notifications" },
    ],
  },
  {
    id: "general",
    title: "GENERAL",
    rows: [{ id: "general", label: "General", subtitle: "Auto appearance · Miles · Midnight", route: "/settings/general" }],
  },
  {
    id: "data-connections",
    title: "DATA & CONNECTIONS",
    rows: [
      { id: "connections", label: "Connections", subtitle: "Apple Health demo · 1 shortcut added", route: "/settings/connections" },
      { id: "data", label: "Manage data", subtitle: "Exports, resets, and local deletion", route: "/settings/data" },
    ],
  },
  {
    id: "support",
    title: "SUPPORT & FEEDBACK",
    rows: [
      { id: "help", label: "Help & FAQ", subtitle: "Locking, earning, permissions, and billing", route: "/support/help" },
      { id: "contact", label: "Contact support", subtitle: "Preview a support message", route: "/support/contact" },
      { id: "bug", label: "Report a bug", subtitle: "Preview a bug report", route: "/support/bug" },
      { id: "idea", label: "Request a feature", subtitle: "Save a sample idea locally", route: "/support/idea" },
      { id: "diagnostics", label: "Send diagnostics", subtitle: "Status-only sample bundle", route: "/support/diagnostics" },
    ],
  },
  {
    id: "about",
    title: "ABOUT",
    rows: [{ id: "about", label: "About ExcerLock", subtitle: "What’s new, share, legal, and credits", route: "/settings/about" }],
  },
] as const;

export const settingsRootCopy = {
  title: "Settings",
  signedOutAccountSubtitle: "Signed out · Setup kept",
  footer: "ExcerLock 1.0.0 (100) · Prototype",
  debugTapCount: 7,
} as const;

export type PermissionDetailId = "screenTime" | "location" | "motion" | "health" | "notifications";

export const permissionHealthFixtures: Record<
  PermissionDetailId,
  { label: string; attentionStatus: string; healthyStatus: string; internalAttentionStatus: PermissionStatus }
> = {
  screenTime: { label: "Screen Time", attentionStatus: "Allowed in demo", healthyStatus: "Allowed in demo", internalAttentionStatus: "allowedInDemo" },
  location: { label: "Location", attentionStatus: "Needs attention", healthyStatus: "Allowed in demo", internalAttentionStatus: "needsAttention" },
  motion: { label: "Motion & Fitness", attentionStatus: "Allowed in demo", healthyStatus: "Allowed in demo", internalAttentionStatus: "allowedInDemo" },
  health: { label: "Apple Health", attentionStatus: "Allowed in demo", healthyStatus: "Allowed in demo", internalAttentionStatus: "allowedInDemo" },
  notifications: { label: "Notifications", attentionStatus: "Not asked · optional", healthyStatus: "Allowed in demo", internalAttentionStatus: "notAsked" },
};

export const permissionsScreenCopy = {
  title: "Permissions",
  aboutRowSubtitle: "What each permission would enable and what this prototype actually does.",
  deniedActions: ["Open Settings preview", "About data", "Try again"],
  healthyAction: "Mark as not asked in demo",
  settingsDisclosure: "Prototype preview — iOS Settings will not open.",
} as const;

export const permissionDetails = {
  screenTime: {
    permission: "Screen Time",
    title: "Keep your chosen apps behind the lock",
    body: "The product concept uses Screen Time authorization to shield only the apps you select. This prototype shows sample names and makes no system request.",
    without: "You can still explore every demo screen; no real apps are blocked.",
  },
  location: {
    permission: "Location",
    title: "Check in when you’re at the gym",
    body: "A manual check-in could compare while-in-use location with a saved radius. Auto-detect would be optional. This prototype reads no location.",
    without: "Walking, steps, and workout conditions still make sense without gym check-ins.",
  },
  motion: {
    permission: "Motion & Fitness",
    title: "Know when a walk is really moving",
    body: "A walking session could use motion classification and cadence while it is explicitly active. This prototype uses a timer and sample steps only.",
    without: "Other conditions remain available.",
  },
  health: {
    permission: "Apple Health",
    title: "Let recorded workouts count",
    body: "The product concept reads device-recorded workouts, steps, distance, active calories, and active minutes. Manual entries would not count. This prototype reads none of them.",
    without: "Gym and walking-session previews remain available.",
  },
  notifications: {
    permission: "Notifications",
    title: "Hear about the wins you choose",
    body: "Optional nudges could point back to Home or Analysis. Every type starts off. This prototype schedules nothing.",
    without: "The core app concept still works without notifications.",
  },
} as const;

export const aboutPermissionsSections = [
  { title: "Screen Time", body: "Only the group you choose would be shielded. Phone, Messages, Maps, ExcerLock, emergency features, and iOS exemptions stay available." },
  { title: "Location", body: "Manual gym check-in is the complete lighter-permission path. Background auto-detect is optional." },
  { title: "Motion & Fitness", body: "Used only during an explicitly started walking session in the product concept." },
  { title: "Apple Health", body: "Read-only activity signals; no raw values appear in support or share content." },
  { title: "Notifications", body: "Three opt-in types, all off by default." },
  { title: "Prototype", body: "No permission, device data, or system setting is accessed here." },
] as const;

export const accountCopy = {
  title: "Account",
  signedInRows: [
    { label: "Email", value: "jordan@example.com" },
    { label: "Account status", value: "Demo profile" },
  ],
  actions: ["Sign out", "Delete account"],
  signOutAlert: {
    title: "Sign out of the demo profile?",
    body: "The prototype will switch to its signed-out sample state. The local setup stays here and no account is changed.",
    actions: ["Cancel", "Sign out"],
  },
  signedOut: {
    statusChip: "SIGNED OUT",
    title: "Sign in to restore your setup",
    body: "Your local conditions, rules, and sample history are still here. This preview simply reconnects Jordan’s demo profile to them.",
    rows: [
      { label: "Email", value: "—" },
      { label: "Account status", value: "Signed out · Local setup kept" },
    ],
    primary: "Sign in",
    secondary: "Back to Settings",
    note: "No server session ended and no account data moved.",
    route: "/signup?mode=recovery&returnTo=account",
  },
  recovered: {
    statusChip: "DEMO PROFILE",
    email: "jordan@example.com",
    status: "Signed in for this demo",
    notice: "Jordan’s sample profile is connected again. Nothing was downloaded.",
  },
  delete: {
    title: "Delete account",
    body: "In a real account flow this would remove account and server records. Here it only resets local demo state.",
    confirmationLabel: "Type DELETE to continue.",
    placeholder: "DELETE",
    primary: "Delete demo account",
    disabledReason: "Type DELETE exactly.",
    resultTitle: "Demo account removed",
    resultBody: "Local sample state was reset. No account or server record changed.",
    resultAction: "Done",
  },
} as const;

export const notificationSettingsCopy = {
  title: "Notifications",
  body: "Choose only the reminders that feel useful. Every type starts off.",
  toggles: [
    { id: "afternoonNudge", label: "Afternoon nudge", subtitle: "3:00 PM · A gentle path back to earning", defaultEnabled: false },
    { id: "weeklyRecap", label: "Weekly recap", subtitle: "Last day of week at 6:00 PM", defaultEnabled: false },
    { id: "streakLastCall", label: "Streak last-call", subtitle: "9:00 PM · Only when explicitly enabled", defaultEnabled: false },
  ],
  nudgeTime: { title: "Afternoon nudge time", fixture: "3:00 PM", actions: ["Cancel", "Done"] },
  quietHours: "Sample delivery rules use 10:00 PM–7:00 AM quiet hours.",
  prototypeNote: "No notification is scheduled.",
  firstTogglePrimer: {
    title: "Get one helpful nudge",
    body: "Preview a reminder when there is still time to earn. This prototype will not request notification access or schedule anything.",
    primary: "Continue",
    secondary: "Not now",
    simulatedNativeId: "native.permission.notifications",
  },
} as const;

export const notificationPreviewCopy = {
  nudge: { title: "Your screen time is waiting", body: "A quick workout unlocks your apps for tonight." },
  recap: { title: "You reclaimed 6h 20m this week", body: "See your week + grab your share card." },
  lastCall: { title: "12-day streak on the line", body: "There’s still time today—one workout keeps it alive." },
} as const;

export type NotificationPreviewSlug = "nudge" | "recap" | "last-call";

export const notificationEntryFixtures: readonly {
  domainKind: NotificationEntryKind;
  slug: NotificationPreviewSlug;
  queryValue: "nudge" | "recap" | "lastCall";
  route: string;
  designId: string;
  destination: string;
  entryChip: string;
  conclusion: string;
  body: string;
  focus: string;
  simulatedNotificationEntry: true;
}[] = [
  {
    domainKind: "afternoonNudge",
    slug: "nudge",
    queryValue: "nudge",
    route: "/notification-preview/nudge",
    designId: "D-NOT-01",
    destination: "/(tabs)/home?entry=nudge",
    entryChip: "FROM NOTIFICATION PREVIEW",
    conclusion: "A little room is waiting.",
    body: "Choose a workout or walk when it fits. Your sample setup is ready.",
    focus: "Cheapest available condition; Add your first way to earn when empty.",
    simulatedNotificationEntry: true,
  },
  {
    domainKind: "weeklyRecap",
    slug: "recap",
    queryValue: "recap",
    route: "/notification-preview/recap",
    designId: "D-NOT-02",
    destination: "/(tabs)/analysis?entry=recap",
    entryChip: "WEEKLY RECAP PREVIEW",
    conclusion: "You reclaimed 6h 20m last week.",
    body: "Five active days, seven earns, and 6h 20m reclaimed—take a look or make a share card.",
    focus: "Expand Jul 27–Aug 2 recap; Share opens /share-achievement?type=recap.",
    simulatedNotificationEntry: true,
  },
  {
    domainKind: "streakLastCall",
    slug: "last-call",
    queryValue: "lastCall",
    route: "/notification-preview/last-call",
    designId: "D-NOT-03",
    destination: "/(tabs)/home?entry=lastCall",
    entryChip: "STREAK REMINDER PREVIEW",
    conclusion: "Keep the 12-day rhythm going.",
    body: "One meaningful activity today keeps the sample streak moving. No rush from this prototype.",
    focus: "Goal progress and cheapest qualifying condition.",
    simulatedNotificationEntry: true,
  },
] as const;

export const notificationEntrySharedCopy = {
  unopenedActions: ["Tap notification", "Dismiss"],
  dismissAccessibilityLabel: "Dismiss notification preview context.",
  disclosure: "Opened from a sample notification. Nothing was delivered.",
  appName: "ExcerLock",
  timestamp: "now",
} as const;

export const generalSettingsRows = [
  { id: "appearance", label: "Appearance", value: "Auto", route: "/settings/appearance" },
  { id: "language", label: "Language", value: "English (US) · System managed", route: "/settings/language" },
  { id: "dayBoundary", label: "Day boundary", value: "Midnight", route: "/settings/day-boundary" },
  { id: "startWeek", label: "Start week on", value: "Use device setting", route: "/settings/start-week" },
  { id: "units", label: "Units", value: "Miles", route: "/settings/units" },
  { id: "shortcuts", label: "Siri & Shortcuts", value: "1 added", route: "/settings/shortcuts" },
  { id: "haptics", label: "Haptics", value: "On", toggle: true },
  { id: "sounds", label: "Sounds", value: "Off", toggle: true },
] as const;

export const generalSettingsOptions = {
  appearance: {
    options: ["Auto", "Light", "Dark"],
    helper: "Orange remains the brand; Light uses warm ivory and Dark uses warm near-black.",
  },
  language: {
    title: "Language",
    body: "Language is managed by iOS in the product concept.",
    primary: "Open Settings preview",
    disclosure: "No system page opens in this prototype.",
  },
  dayBoundary: {
    title: "Day boundary",
    body: "Choose when a new allowance day would begin.",
    options: ["Off · Midnight", "Custom"],
    customFixture: "4:00 AM",
    consequence: "At 4:00 AM, the sample balance and today labels reset.",
    primary: "Done",
  },
  startWeek: { options: ["Use device setting", "Sunday", "Monday"], commit: "immediate" },
  units: {
    options: ["Miles", "Kilometers"],
    helper: "Running and cycling conditions update their labels. Existing sample meaning stays the same.",
    commit: "immediate",
  },
} as const;

export const shortcutFixtures = [
  { id: "balance", title: "Check balance", phrase: "How much time do I have left?", status: "Added" },
  { id: "walking", title: "Start walking", phrase: "Start a walking session.", status: "Add" },
  { id: "gym", title: "Check in at the gym", phrase: "Check me in at the gym.", status: "Add" },
] as const;

export const shortcutsDisclosure = "Prototype preview — no Siri shortcut is created or removed.";

export const connectionsCopy = {
  title: "Connections",
  body: "Apple Health and Siri & Shortcuts are the only connection surfaces in this v1 prototype.",
  rows: [
    { label: "Apple Health", value: "Demo status · Connected", route: "/settings/apple-health" },
    { label: "Siri & Shortcuts", value: "1 demo shortcut added", route: "/settings/shortcuts" },
  ],
} as const;

export const appleHealthCopy = {
  title: "Apple Health",
  body: "This page previews the signals the product concept could read. No Health data is accessed.",
  manualEntryNote: "Manually typed entries would not count.",
  diagnosticsAction: "Run diagnostics",
  signals: [
    { signal: "Workouts", status: "Sample available · 8:42 AM" },
    { signal: "Steps", status: "Sample available · 8:40 AM" },
    { signal: "Running distance", status: "Sample available · Yesterday" },
    { signal: "Cycling distance", status: "No sample today" },
    { signal: "Swimming distance", status: "No sample today" },
    { signal: "Active calories", status: "Sample available · 8:40 AM" },
    { signal: "Active minutes", status: "Sample available · 8:40 AM" },
  ],
  disconnectAlert: {
    title: "Disconnect the Apple Health demo?",
    body: "Apple Health conditions will show Needs attention. No Health permission changes.",
    actions: ["Cancel", "Disconnect in demo"],
  },
} as const;

export const manageDataCopy = {
  title: "Manage data",
  body: "Every action below is a prototype preview.",
  rows: [
    { id: "activity", label: "Export activity ledger", subtitle: "Preview a JSON share sheet for sample earn and streak history. No file is created." },
    { id: "conditions", label: "Export conditions", subtitle: "Preview a JSON share sheet for the current local conditions. Natural first state contains none; Debug showcase contains three. No file is created." },
    { id: "reset", label: "Reset demo data", subtitle: "Restore the guided sample state and keep onboarding complete." },
    { id: "delete", label: "Delete all local data", subtitle: "Return the prototype to first-run state. No device or server data is touched." },
  ],
  exportResult: {
    title: "Export preview ready",
    body: "No file was created. You can open the simulated share sheet to inspect the handoff.",
    primary: "Preview share",
    secondary: "Done",
  },
  resetAlert: {
    title: "Reset demo data?",
    body: "Sample history, settings, and conditions will return to their starting fixtures.",
    actions: ["Cancel", "Reset"],
  },
  deleteAlert: {
    title: "Delete all local demo data?",
    body: "The prototype will return to onboarding. No device, Health, Screen Time, account, or server data is touched.",
    actions: ["Cancel", "Delete demo data"],
  },
} as const;

export const helpCopy = {
  title: "Help & FAQ",
  greeting: "Hi there. How can we help?",
  searchPlaceholder: "Search sample help",
  contactRow: { label: "Contact support", subtitle: "Preview a message to support@excerlock.com" },
  articles: [
    { id: "apps-locked", title: "Why are my apps still locked?", subtitle: "Balance, Full Lock, walking, and schedules." },
    { id: "earning", title: "How earning adds time", subtitle: "Events, states, and rates in plain language." },
    { id: "permissions", title: "Fix a permission preview", subtitle: "Screen Time, Location, Motion, Health, and Notifications." },
    { id: "gym", title: "Why couldn’t the gym check-in verify?", subtitle: "Sample radius and Location status." },
    { id: "subscription", title: "Manage a trial or subscription", subtitle: "Plans, restore, and cancellation preview." },
  ],
  browserDisclosure: "Local prototype article — no web page is loaded.",
} as const;

export const helpArticleDetails = {
  "apps-locked": {
    lede: "A locked app can reflect an empty balance, Full Lock, an active schedule, or a walking session that has not verified yet.",
    relatedAction: "Review Home lock status",
    sections: [
      { title: "Start with the lock reason", body: "Home names the current sample lock reason beside the balance. That label is the shortest path to the right local recovery preview." },
      { title: "Check rules and sessions", body: "A rest day or time outside the lock window should not drain the sample balance. A walking state starts earning only after its local verifying step finishes." },
      { title: "Nothing changed on your device", body: "This prototype never shields an installed app or reads Screen Time. Every lock state is a deterministic visual fixture." },
    ],
  },
  earning: {
    lede: "ExcerLock presents three local earning models: finish an event, remain in a verified state, or exchange activity at a rate.",
    relatedAction: "See earning paths on Home",
    sections: [
      { title: "Events", body: "An event grants its configured reward once when the sample threshold is reached." },
      { title: "States", body: "A state keeps selected apps available while the local walking or gym condition remains verified." },
      { title: "Rates", body: "A rate converts eligible sample movement into minutes up to its visible local cap." },
    ],
  },
  permissions: {
    lede: "Permission rows explain the product concept and expose only local Allowed, Not now, and repair fixtures.",
    relatedAction: "Review permission health",
    sections: [
      { title: "Read the benefit first", body: "Each permission detail says what the product concept could do, what data category it would use, and what still works without access." },
      { title: "Repair stays simulated", body: "Open Settings and Try again actions display labeled local previews. They never open iOS Settings or request authorization." },
      { title: "Status is not device truth", body: "Allowed in demo means only that this prototype will show the healthy branch." },
    ],
  },
  gym: {
    lede: "A gym check-in can fail locally when the saved radius or Location fixture needs attention.",
    relatedAction: "Review Location permission",
    sections: [
      { title: "What to check", body: "Confirm the selected sample gym, inspect its radius, and make sure Location is marked Allowed in demo." },
      { title: "Try the recovery path", body: "Instructions opens the local Location explainer. Try again restarts the deterministic verifying animation." },
      { title: "No coordinates are read", body: "The map, radius, arrival, and verification results are hardcoded previews. No location service starts." },
    ],
  },
  subscription: {
    lede: "Trial, active, cancelled, restore, and resubscribe states are local billing fixtures.",
    relatedAction: "Open subscription preview",
    sections: [
      { title: "Manage the sample plan", body: "The subscription screen shows the current local status, renewal language, and a staged cancellation path." },
      { title: "Restore has two outcomes", body: "Choose Restored or Nothing to restore to inspect both deterministic progress results." },
      { title: "No purchase is made", body: "No receipt, App Store account, payment method, or billing service is contacted." },
    ],
  },
} as const;

export const supportComposerFixtures = {
  contact: { title: "Contact support", placeholder: "What can we help with?" },
  bug: { title: "Report a bug", placeholder: "What happened, and what did you expect?" },
  idea: { title: "Request a feature", placeholder: "What would make ExcerLock more useful?" },
  shared: {
    helper: "Nothing is sent from this prototype.",
    bugAttachment: "Add sample screenshot",
    attachmentDisclosure: "No photo or screenshot picker opens.",
    characterCount: "0/1000",
    disabledReason: "Add a message first.",
    visibleDiagnostics: ["App 1.0.0 (100)", "iOS 18.6 sample", "permission summary", "subscription demo state"],
    sendAction: "Send preview",
  },
  result: {
    title: "Thanks for the detail.",
    body: "This demo message was saved only for the current preview. Nothing was sent.",
    action: "Done",
  },
} as const;

export const diagnosticsCopy = {
  title: "Send diagnostics",
  body: "Preview a status-only support bundle. It never includes health values, sample app names, gym names, or coordinates.",
  primary: "Prepare sample bundle",
  secondary: "Back",
  fields: [
    { section: "Device & app", value: "iPhone 15 Pro sample; iOS 18.6 sample; locale en-US; America/New_York; low-power mode Off; background refresh On." },
    { section: "Account & plan", value: "user_demo_001; Free trial." },
    { section: "Permissions", value: "Status labels only." },
    { section: "Blocking health", value: "Shield inactive; 3 sample apps; monitor registered in demo; last shield preview 8:12 AM." },
    { section: "Signal freshness", value: "Timestamps and source label only; no values." },
    { section: "Economy · natural first", value: "0 min balance; 0 min earned; 45 min spent; 0-day streak; zero active conditions." },
    { section: "Economy · debug/showcase", value: "0 min balance; 125 min earned; 170 min spent; 12-day streak; three active conditions." },
    { section: "Rules", value: "Midnight boundary; device week start; Miles; Mon–Sat active; Sun rest; no lock window." },
  ],
  success: {
    title: "Sample bundle ready",
    body: "Review the status-only fields, then preview the share handoff.",
    primary: "Share bundle preview",
    secondary: "Done",
  },
  failure: {
    title: "No data found",
    body: "The selected sample date may have no fixture, or a permission state may need attention.",
    repair: "Your setup is still here.",
    primary: "Instructions",
    secondary: "Back",
  },
} as const;

export const aboutCopy = {
  title: "About ExcerLock",
  rows: [
    { id: "whats-new", label: "What’s new", subtitle: "Version 1.0", route: "/settings/whats-new" },
    { id: "rate", label: "Rate ExcerLock", subtitle: "Prototype only", afterManualSubtitle: "Automatic previews off", route: "/settings/rate" },
    { id: "share", label: "Share ExcerLock", subtitle: "Preview the iOS share sheet" },
    { id: "follow", label: "Follow us", subtitle: "TikTok and Instagram", route: "/settings/follow" },
    { id: "credits", label: "Credits", subtitle: "Acknowledgements", route: "/settings/credits" },
    { id: "terms", label: "Terms of Use", subtitle: "Local prototype document", route: "/legal/terms" },
    { id: "privacy", label: "Privacy Policy", subtitle: "Local prototype document", route: "/legal/privacy" },
  ],
} as const;

export const whatsNewCopy = {
  title: "What’s new",
  release: "Version 1.0 · First look",
  date: "August 7, 2026",
  cards: [
    { title: "A lock that moves with you", body: "Preview locked and unlocked Home states." },
    { title: "Three ways to earn", body: "Event, state, and rate cards now share one system." },
    { title: "Your time, made visible", body: "Sample trends, heat map, milestones, and share cards." },
  ],
} as const;

export const rateCopy = {
  title: "Rate ExcerLock",
  body: "If this gentler rhythm feels useful, you can preview the App Store rating handoff. It will not open the store or submit a rating.",
  primary: "Preview rating prompt",
  secondary: "Not now",
  manualConsequence: "Opening Rate ExcerLock turns off all future automatic review previews in this demo, even if the prompt is cancelled.",
  prompt: {
    designId: "D-SET-25",
    title: "Enjoying ExcerLock?",
    body: "Tap a star to preview a rating on the App Store.",
    initialStars: null,
    guidedStars: 5,
    actions: ["Not Now", "Submit"],
    disclosure: "Prototype preview — the App Store will not open and no rating will be submitted.",
    disabledReason: "Choose a sample star rating.",
    simulatedNative: true,
    simulatedNativeId: "native.review",
  },
  terminal: {
    title: "Rating preview complete",
    body: "No rating was submitted. Automatic review previews are now off in this demo.",
    action: "Done",
  },
} as const;

export const reviewPromptLifecycleFixture = {
  installAgeDays: 98,
  unlockMomentCount: 5,
  currentStreakDays: 12,
  automaticShows: 0,
  manualRateOpened: false,
  lastShieldShownAt: null as string | null,
  suppressionWindowMinutes: 30,
  maximumAutomaticShows: 3,
  triggerOrder: ["fifthUnlockAfterDayThree", "firstSevenDayStreak", "thirtyDayStreak"],
} as const;

export const reviewLifecycleStates = [
  { id: "eligible-first", status: "Ready after the fifth unlock", result: "Show only after the fifth unlock moment finishes and its in-place Home animation is dismissed; install age must be at least 3 days." },
  { id: "eligible-second", status: "Ready at the first 7-day streak", result: "Show only if automatic preview count is below 3 and manual Rate has never opened." },
  { id: "eligible-third", status: "Ready at the 30-day streak", result: "Final automatic opportunity under the same guards." },
  { id: "presented", status: "Rating preview open", result: "Show the simulated native stars and return to the originating positive surface after either action." },
  { id: "dismissed", status: "Maybe another time", result: "Increment automaticShows and return without changing a rating, balance, unlock, or streak fixture." },
  { id: "rated", status: "Thanks for the preview", result: "Show Rating preview complete, then permanently stop automatic review previews; no rating was recorded." },
  { id: "suppressed-shield", status: "Waiting after a shield", result: "A shield preview was shown 12 minutes ago. Automatic review preview can be reconsidered in 18 minutes." },
  { id: "stopped-three", status: "Automatic previews complete", result: "Three automatic review previews have been shown. Do not ask again." },
  { id: "stopped-manual", status: "Automatic previews off", result: "Rate ExcerLock was opened manually. Do not ask automatically again." },
] as const;

export const aboutDetailCopy = {
  share: {
    text: "I’m trying a screen-time setup that makes movement the way back in. ExcerLock — Workout to Unlock.",
    disclosure: "Nothing leaves this prototype.",
  },
  follow: {
    title: "Follow ExcerLock",
    body: "Preview the external-link rows.",
    rows: [
      { label: "TikTok", subtitle: "Prototype link" },
      { label: "Instagram", subtitle: "Prototype link" },
    ],
    result: "External link preview only. No app or browser opened.",
  },
  credits: {
    title: "Credits",
    body: "ExcerLock is an original UI prototype. User-facing acknowledgements belong here; internal generated-asset provenance remains in the project foundry manifests.",
    section: "Platform conventions",
    row: { label: "Apple system surfaces", value: "Shown only as clearly labeled prototype simulations." },
  },
  legal: {
    titles: ["Terms of Use", "Privacy Policy"],
    eyebrow: "Local prototype document",
    updated: "August 7, 2026",
    openingBody: "This local document exists only to preview the legal handoff and reading layout. It is not a published policy or agreement.",
    actions: ["Done", "Reader", "Share preview"],
    disclosure: "No document or URL is shared.",
  },
} as const;

export const debugContent = {
  title: "Demo states",
  body: "Jump to any hardcoded visual state. Nothing outside this prototype changes.",
  sections: [
    { title: "FIRST RUN", rows: ["Reset onboarding", "Open paywall annual", "Open paywall monthly", "Purchase loading", "Purchase success", "Post-purchase Signup", "Signup email validation", "Signup failure"] },
    { title: "AUTH", rows: ["Demo profile signed in", "Account signed out", "Sign-in", "Sign-in failure"] },
    { title: "HOME", rows: ["Natural first Home", "Locked showcase", "Unlocked showcase", "Earn transition", "10 minutes left", "Empty balance", "Rest of day", "Set period", "Rest day", "Outside lock window"] },
    { title: "CARDS", rows: ["Showcase event", "Showcase state inactive", "Showcase state active", "Showcase rate"] },
    { title: "WALK", rows: ["Ready", "Verifying", "Active", "Paused", "Grace", "Ended by user", "Ended after stop", "Permission lost"] },
    { title: "GYM", rows: ["Ready", "Verifying", "Verified", "Failed"] },
    { title: "MANAGE", rows: ["Natural zero conditions", "Seed showcase conditions", "Reorder", "Delete confirmation", "Base allowance", "Rollover off/on", "Reset my streak/One automatic cushion", "Saved gyms empty/2/5", "Manual/auto-detect", "Custom-day reward overrides"] },
    { title: "ANALYSIS", rows: ["Populated", "Empty", "New badge", "Locked badge", "Weekly recap"] },
    { title: "PERMISSIONS", rows: ["Needs attention", "All ready"] },
    { title: "SUBSCRIPTION", rows: ["Trial", "Active", "Cancelled", "Restore none"] },
    { title: "NOTIFICATION ENTRIES", rows: ["Afternoon nudge → Home", "Weekly recap → Analysis/share", "Streak last-call → Home"] },
    { title: "REVIEW", rows: ["First eligible", "Seven-day eligible", "30-day eligible", "Shield-suppressed", "Three-show stop", "Manual-Rate stop"] },
    { title: "SHIELDS", rows: ["Balance empty", "Full Lock", "Walk ended", "Schedule"] },
    { title: "SYSTEM PREVIEWS", rows: ["Permission", "Always Location", "Account handoff", "Family Activity picker", "Purchase", "Share", "Settings", "Map", "Photo", "Browser", "Review"] },
  ],
  destructiveRow: "Reset all demo state",
  resetAlert: {
    title: "Reset every demo state?",
    body: "The prototype will return to Splash with first-run fixtures.",
    actions: ["Cancel", "Reset all"],
  },
} as const;
