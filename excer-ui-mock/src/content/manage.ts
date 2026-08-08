import { allowancePicker } from "./onboarding";

export const manageRootCopy = {
  title: "Manage",
  sections: {
    conditions: "CONDITIONS",
    lockedApps: "LOCKED APPS",
    rules: "RULES",
  },
  addAction: "Add condition",
  emptyTitle: "No conditions yet",
  emptyBody: "Add a way to earn and its card will appear here and on Home.",
  disableHelper: "Off keeps the sample history and settings. Delete removes the condition from the active list.",
  lockedAppsRow: { label: "Locked apps", value: "3 selected" },
  naturalRulesRow: { label: "Rules", value: "45 min allowance · Rollover off" },
  showcaseRulesRow: { label: "Rules", value: "45 min · Reset my streak · 2 gyms" },
} as const;

export const firstManageFixture = {
  conditions: [] as string[],
  lockedAppCount: 3,
  dailyAllowanceMinutes: 45,
  rollover: { enabled: false, capMinutes: null },
  streakPolicy: "hardReset",
  savedGyms: [] as string[],
} as const;

export const showcaseManageConditionRows = [
  { id: "demo-gym", name: "Go to gym", subtitle: "Event · Ready today", enabled: true },
  { id: "demo-walk", name: "While walking", subtitle: "State · Inactive", enabled: true },
  { id: "demo-steps", name: "Steps exchange", subtitle: "Rate · 2h 05m today", enabled: true },
] as const;

export const conditionListCopy = {
  idleAction: "Edit",
  reorderAction: "Done",
  reorderHelper: "Press and hold a handle to change the order shown on Home.",
  swipeAction: "Remove",
  reorderAccessibilityHint: "Moves this condition before or after another condition; the Home card order updates with it.",
  emptyAction: "Add condition",
  removeAlert: {
    title: "Remove “{conditionName}”?",
    body: "The condition will leave Home and Manage. Past sample Analysis entries remain.",
    actions: ["Cancel", "Remove"],
  },
} as const;

export const lockedAppsCopy = {
  title: "Locked apps",
  body: "Choose from the same sample list used during onboarding. Nothing installed on this device is inspected or changed.",
  searchPlaceholder: "Search sample apps",
  initialCount: "3 selected",
  actions: ["Cancel", "Done"],
  doneDisabledReason: "Select at least one sample app.",
  supportingLink: "What stays available?",
  explainer: {
    title: "What stays available?",
    body: "In the product concept, Phone, Messages, Maps, ExcerLock, emergency features, and anything iOS exempts would remain available.",
    note: "This picker uses sample names and does not inspect or change installed apps.",
    action: "Done",
  },
} as const;

export const rulesHubCopy = {
  title: "Rules",
  body: "Keep the balance, streak, schedule, and saved places in one clear setup.",
  rows: [
    { id: "allowance", label: "Base allowance", value: "45 min" },
    { id: "rollover", label: "Rollover", value: "Off" },
    { id: "streak", label: "Streak policy", value: "Reset my streak" },
    { id: "weekly", label: "Weekly schedule & lock window", value: "Mon–Sat active · Sun rest" },
    { id: "gyms", label: "Saved gyms", naturalValue: "0 of 5", showcaseValue: "2 of 5" },
  ],
  todaySection: "TODAY",
  todayRow: { label: "Use a rest day today", value: "Reason required" },
} as const;

export const baseAllowanceCopy = {
  title: "Daily free allowance",
  body: "Choose how much time the selected apps would get before movement adds more.",
  currentFixture: 45,
  picker: allowancePicker,
  guidedConsequence: "The sample apps would use 45 minutes, then wait for the next earn.",
  zeroConsequence: "The sample apps would begin behind Full Lock until a condition opens them.",
  unlimitedConsequence: "The sample apps would stay open all day; conditions can still build Analysis history.",
  actions: ["Cancel", "Done"],
  disabledReason: "Choose a daily amount.",
  parentSubtitleExamples: ["45 min", "Full Lock", "Unlimited"],
} as const;

export const rolloverOptions = {
  enabledInitial: false,
  modes: [
    { id: "off", label: "Off", subtitle: "Each day starts with only that day’s allowance." },
    { id: "capped", label: "Carry some forward", subtitle: "Unused balance can reach tomorrow, up to a cap." },
  ],
  capMinutes: { min: 30, max: 240, step: 30, guidedFixture: 60 },
  capLabels: ["30 min", "1 h", "1 h 30 min", "2 h", "2 h 30 min", "3 h", "3 h 30 min", "4 h"],
  title: "Carry unused time forward",
  body: "Decide whether unused sample balance would follow you into tomorrow.",
  initialRow: "Off",
  dependentRow: { label: "Rollover cap", value: "1 h sample" },
  enabledSentence: "Up to 1 hour of unused balance would carry into the next allowance day.",
  offSentence: "Unused balance would clear at the day boundary.",
  actions: ["Cancel", "Done"],
  disabledReason: "Choose a rollover cap.",
  parentSubtitleExamples: ["Off", "Up to 1 h"],
} as const;

export const streakPolicyOptions = [
  { id: "hard-reset", label: "Reset my streak", subtitle: "A missed Active day resets the streak at the next day boundary." },
  { id: "auto-cushion", label: "Use one automatic cushion", subtitle: "The first missed Active day in a streak becomes a logged Rest day; the next miss resets it." },
] as const;

export const streakPolicyCopy = {
  title: "When I miss an active day",
  body: "Choose what happens when an Active day is missed. Planned Rest days and the typed rest-day override never break a streak.",
  initial: "hard-reset",
  learnMoreAction: "How streak cushions work",
  learnMoreBody: "One automatic cushion changes only the first missed Active day in the current streak to a logged Rest day. It never adds activity or time.",
  parentSubtitleExamples: ["Reset my streak", "One automatic cushion"],
} as const;

export const savedGymsCopy = {
  title: "Saved gyms",
  emptyTitle: "No gyms saved yet",
  emptyBody: "Add a sample place when you want gym arrival, presence, or time conditions.",
  naturalCount: "0 of 5 gyms",
  addAction: "Add a gym",
  rows: [
    { id: "harbor-strength", name: "Harbor Strength", subtitle: "Manual check-in · 100 m · Verified gym" },
    { id: "northside", name: "Northside Community Gym", subtitle: "Auto-detect preview · 100 m · Honor system" },
  ],
  capacityDisabledReason: "You’ve saved 5 gyms. Remove one to add another.",
  footer: "This prototype never searches places, scans Wi‑Fi, or reads location.",
} as const;

export const savedGymDetailFixture = {
  title: "Harbor Strength",
  fields: {
    name: { label: "Name", value: "Harbor Strength", minLength: 1, maxLength: 60 },
    placeType: { label: "Place type", value: "Verified gym", options: ["Verified gym", "Honor system"] },
    radius: { label: "Arrival radius", value: 100, unit: "m", options: [50, 75, 100, 125, 150, 175, 200] },
    mode: { label: "Check-in mode", value: "Manual check-in", options: ["Manual check-in", "Auto-detect"] },
    wifi: { label: "Wi‑Fi confirmation", value: "Off", options: ["Off", "Use sample network"] },
  },
  radiusHelper: "A wider radius is easier to detect but less precise.",
  manualSubtitle: "Open ExcerLock and check in when you arrive. The product concept would need only while-in-use location.",
  autoSubtitle: "Let the product concept notice an arrival in the background. Always Location would be required; manual check-in remains available.",
  wifiSampleNetwork: "Harbor-Guest",
  wifiDisclosure: "Prototype preview — no nearby networks are scanned or joined.",
  actions: ["Cancel", "Save gym"],
  destructiveAction: "Remove gym",
  removeAlert: {
    title: "Remove Harbor Strength?",
    body: "Conditions using this sample gym will show Needs attention until another place is selected. Past Analysis entries stay visible.",
    actions: ["Cancel", "Remove"],
  },
} as const;

export const autoDetectPrimer = {
  title: "Make check-ins hands-free",
  body: "Auto-detect would use Always Location for this saved gym. Manual check-in is the complete lighter-permission path and stays available.",
  operationalNote: "This prototype changes only the local demo status and never reads location.",
  primary: "Preview Always Location",
  secondary: "Keep manual check-in",
  simulatedNative: true,
  simulatedNativeId: "native.permission.locationAlways",
  disclosure: "Prototype preview — no Always Location permission is requested.",
  allowedResult: { label: "Auto-detect preview", value: "On" },
  notNowResult: {
    title: "Manual check-in is still ready.",
    body: "Harbor Strength stays saved at 100 m. You can preview auto-detect later.",
    action: "Done",
  },
} as const;

export const weeklyRulesFixture = {
  monday: "active",
  tuesday: "active",
  wednesday: "active",
  thursday: "active",
  friday: "active",
  saturday: "active",
  sunday: "rest",
  restBehavior: "noLocking",
  lockWindow: null,
  plannedDaysOff: [{ date: "2026-09-07", label: "Monday, September 7", state: "rest" }],
} as const;

export const weeklyRulesCopy = {
  title: "Weekly rules",
  summary: "Six active days · Sunday is a Rest day.",
  restHelper: "Rest days do not extend or break a streak.",
  lockWindowHelper: "Outside a lock window there is no locking and no balance drain.",
  addDateAction: "Add a planned day off",
  primary: "Done",
  lockWindow: {
    title: "Lock window",
    offSubtitle: "Off · Limits can apply all day.",
    onSubtitle: "7:00 PM–7:00 AM",
    defaultEnabled: false,
    from: "7:00 PM",
    to: "7:00 AM",
    helper: "During this window, the sample apps stay behind the lock unless a condition currently opens them. Walking still takes precedence while its condition is active.",
    sheetTitle: "Choose a time",
    actions: ["Cancel", "Done"],
  },
  plannedDaysOff: {
    sectionTitle: "PLANNED DAYS OFF",
    empty: "No planned days off.",
    row: { label: "Monday, September 7", value: "Rest day · Streak unchanged" },
    calendarTitle: "Add a planned day off",
    calendarBody: "The selected date becomes a Rest day and will not extend or break the streak.",
    selectedDate: "September 7, 2026",
    actions: ["Cancel", "Add day off"],
    swipeAction: "Remove",
    removeAlert: {
      title: "Remove September 7?",
      body: "That date will return to its usual Monday rule.",
      actions: ["Cancel", "Remove"],
    },
  },
} as const;

export const weeklyDayChoices = [
  { id: "active", label: "Active", subtitle: "Use the full allowance, earning, and locking rules." },
  { id: "rest", label: "Rest", subtitle: "Do not count this day against the streak." },
  { id: "custom", label: "Custom", subtitle: "Choose a different allowance, condition reward, or lock window for this day." },
] as const;

export const restDayChoices = [
  { id: "no-locking", label: "No locking", subtitle: "A true day off." },
  { id: "allowance-only", label: "Allowance only", subtitle: "Use the daily free time, with no earning required." },
] as const;

export const customDayCopy = {
  rows: [
    { id: "allowance", label: "Daily free time", value: "90 min sample" },
    { id: "window", label: "Lock window", value: "8:00 PM–7:00 AM sample" },
    { id: "rewards", label: "Condition rewards", value: "None" },
  ],
  helper: "These values affect this weekday only in the current local preview.",
  actions: ["Cancel", "Done"],
  rewardOverride: {
    helper: "Untouched conditions keep their usual rules.",
    emptyDisabledReason: "Add a condition before creating a reward override.",
    listTitle: "Choose a condition to change",
    listBody: "The override applies only to this Custom weekday.",
    customizeTitle: "{conditionName} on {weekday}",
    showcaseRows: [
      { name: "Go to gym", value: "Add 45 min today" },
      { name: "While walking", value: "Usual access while active" },
      { name: "Steps exchange", value: "1,000 steps = 10 min today" },
    ],
    stateOptions: ["Use usual access while active", "Off this weekday"],
    resetAction: "Use usual rule",
    footer: "Only this Custom day changes. The saved condition keeps its normal rule everywhere else.",
    actions: ["Cancel", "Done"],
  },
} as const;

export const todayOverrideCopy = {
  title: "Today needs a rest day",
  body: "Turn today into a Rest day without breaking the streak. Add a reason to make the choice deliberate.",
  placeholder: "Why do you need today off?",
  fixtureReason: "Not feeling well today.",
  characterCount: "0/180",
  primary: "Use rest day",
  disabledReason: "Add a short reason first.",
  confirmation: {
    title: "Use a rest day today?",
    body: "Today will not extend or break the streak. The reason stays in this local demo.",
    actions: ["Cancel", "Confirm rest day"],
  },
} as const;
