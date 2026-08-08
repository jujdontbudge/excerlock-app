import type { ContentOption, ScreenCopy } from "./types";

export const onboardingScreens: readonly ScreenCopy[] = [
  {
    id: "D-SPL-01",
    route: "/",
    surface: "brand",
    title: "ExcerLock",
    operationalNote: "Accessibility label: ExcerLock launch screen.",
  },
  {
    id: "D-ONB-01",
    route: "/onboarding/value",
    surface: "brand",
    title: "Earn your screen time.",
    body: "Move your body, earn a little room for the apps you choose.",
    primary: { label: "Next" },
  },
  {
    id: "D-ONB-02",
    route: "/onboarding/confession",
    surface: "focusedChoice",
    title: "How much time do you spend on your phone each day?",
    body: "A rough answer is enough. It only shapes the sample insights ahead.",
    primary: { label: "Next", disabledReason: "Choose a rough daily amount to continue." },
    secondary: { label: "Back" },
  },
  {
    id: "D-ONB-03",
    route: "/onboarding/mirror",
    surface: "brand",
    eyebrow: "At 5 hours a day.",
    title: "That’s about 76 days a year.",
    body: "No guilt. Just a little time worth taking back.",
    primary: { label: "Take some back" },
    secondary: { label: "Back" },
  },
  {
    id: "D-ONB-04",
    route: "/onboarding/privacy",
    surface: "brand",
    title: "Your activity stays yours.",
    body: "This prototype keeps every choice inside this demo. It does not request permissions, read device activity, or send data anywhere.",
    primary: { label: "I accept" },
    secondary: { label: "Learn more" },
  },
  {
    id: "D-ONB-05",
    route: "/onboarding/screen-time",
    surface: "brand",
    title: "Choose the apps that can wait.",
    body: "In the full product, Screen Time access would place the apps you choose behind the lock. This prototype only previews that flow.",
    operationalNote: "Without it, you can still explore every screen here—no real apps are blocked.",
    primary: { label: "Continue" },
    secondary: { label: "Back" },
    simulatedNativeId: "native.permission.screenTime",
  },
  {
    id: "D-ONB-06",
    route: "/onboarding/apps",
    surface: "simulatedNative",
    title: "Choose apps to place behind the lock.",
    body: "Pick a few sample apps. Nothing on your device is shown or changed.",
    primary: { label: "Done", disabledReason: "Select at least one sample app." },
    secondary: { label: "Cancel" },
    simulatedNativeId: "native.familyActivity",
  },
  {
    id: "D-ONB-07",
    route: "/onboarding/motion",
    surface: "brand",
    title: "Keep apps open while you walk.",
    body: "Preview a walking session that responds to movement. No motion or location is read in this prototype.",
    operationalNote: "Balance would still drain normally while walking.",
    primary: { label: "Allow" },
    secondary: { label: "Not now" },
    simulatedNativeId: "native.permission.motion",
  },
  {
    id: "D-ONB-08",
    route: "/onboarding/health",
    surface: "brand",
    title: "Let workouts you already record earn time.",
    body: "Preview how workouts in Apple Health could count toward your conditions. This prototype does not open or read Health data.",
    primary: { label: "Allow" },
    secondary: { label: "Skip" },
    simulatedNativeId: "native.permission.health",
  },
  {
    id: "D-ONB-09",
    route: "/onboarding/location",
    surface: "brand",
    title: "Check in when you arrive.",
    body: "A manual gym check-in could use while-in-use location. Auto-detect would be an optional hands-free upgrade. This prototype uses neither.",
    primary: { label: "Allow" },
    secondary: { label: "Skip" },
    simulatedNativeId: "native.permission.location",
  },
  {
    id: "D-ONB-10",
    route: "/onboarding/allowance",
    surface: "focusedChoice",
    title: "Choose your daily free time.",
    body: "This is the time your chosen apps would get before movement adds more.",
    primary: { label: "Done", disabledReason: "Choose an allowance to continue." },
    secondary: { label: "Back" },
  },
  {
    id: "D-ONB-11",
    route: "/onboarding/review",
    surface: "brand",
    title: "Your setup.",
    body: "One quick look before the lock is ready.",
    primary: { label: "Looks good" },
    secondary: { label: "Back" },
  },
  {
    id: "D-ONB-12",
    route: "/onboarding/done",
    surface: "brand",
    title: "Your lock is ready to help.",
    body: "You chose the apps, the allowance, and the ways movement can make room.",
    primary: { label: "See plans" },
  },
];

export const privacyDetail = {
  title: "About this prototype",
  paragraphs: [
    "Every value in this build is hardcoded sample data.",
    "The prototype does not request Screen Time, Motion, Health, Location, or Notification access.",
    "It does not identify installed apps, block apps, read workouts, read steps, check a location, create an account, or send analytics.",
  ],
  close: "Done",
} as const;

export const phoneUseHours = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, "12+"] as const;

export const confessionFixture = {
  initial: null,
  guidedSelection: 5,
  annualHours: 1825,
  annualDaysRounded: 76,
} as const;

export const allowancePicker = {
  initial: null,
  minutes: { min: 0, max: 240, step: 5 },
  terminalOption: { id: "unlimited", label: "Unlimited", value: "unlimited" },
  zeroLabel: "0 min · Full Lock",
  formatterExamples: {
    5: "5 min",
    45: "45 min",
    60: "1 h",
    90: "1 h 30 min",
    240: "4 h",
  },
  guidedSelection: 45,
  guidedConsequence: "Apps would lock after 45 minutes, then open again when you earn time.",
} as const;

type SampleApp = ContentOption<string> & { name: string };
type SampleAppGroup = {
  id: string;
  label: string;
  options: readonly SampleApp[];
  apps: readonly SampleApp[];
};

export const onboardingPermissionRepair = {
  screenTime: {
    title: "Screen Time preview needs attention",
    body: "Choosing Not now keeps this required demo step in place. Your sample app choices are untouched.",
    action: "Try the preview again",
  },
} as const;

const socialApps: readonly SampleApp[] = [
  { id: "loop", name: "Loop", label: "Loop", subtitle: "Sample social feed", value: "loop" },
  { id: "circle", name: "Circle", label: "Circle", subtitle: "Sample community app", value: "circle" },
];
const videoApps: readonly SampleApp[] = [
  { id: "clips", name: "Clips", label: "Clips", subtitle: "Sample short videos", value: "clips" },
  { id: "watch", name: "Watch", label: "Watch", subtitle: "Sample streaming app", value: "watch" },
];
const gameApps: readonly SampleApp[] = [
  { id: "orbit", name: "Orbit", label: "Orbit", subtitle: "Sample game", value: "orbit" },
  { id: "blocks", name: "Blocks", label: "Blocks", subtitle: "Sample puzzle game", value: "blocks" },
];
const otherApps: readonly SampleApp[] = [
  { id: "browse", name: "Browse", label: "Browse", subtitle: "Sample web browser", value: "browse" },
  { id: "shop", name: "Shop", label: "Shop", subtitle: "Sample shopping app", value: "shop" },
];

export const sampleAppGroups: readonly SampleAppGroup[] = [
  {
    id: "social",
    label: "Social",
    options: socialApps,
    apps: socialApps,
  },
  {
    id: "video",
    label: "Video",
    options: videoApps,
    apps: videoApps,
  },
  {
    id: "games",
    label: "Games",
    options: gameApps,
    apps: gameApps,
  },
  {
    id: "other",
    label: "Other",
    options: otherApps,
    apps: otherApps,
  },
];

export const onboardingReviewRows = [
  { label: "Locked apps", value: "3 selected" },
  { label: "Daily free time", value: "45 min" },
  { label: "Screen Time", value: "Allowed in demo" },
  { label: "Motion & Fitness", value: "Allowed in demo" },
  { label: "Apple Health", value: "Allowed in demo" },
  { label: "Location", value: "Not now" },
] as const;

export const onboardingPickerCopy = {
  searchPlaceholder: "Search sample apps",
  selectedCount: "3 selected",
  denial: {
    body: "Review the preview whenever you’re ready.",
    actions: ["Try again", "Continue without access"],
  },
} as const;
