import type { ConditionKind } from "./types";

export type ConditionCatalogGroup = "Gym" | "Walking" | "Running" | "Cycling" | "Swimming" | "Any activity";

export type ConditionCatalogEntry = {
  id: string;
  group: ConditionCatalogGroup;
  label: string;
  kind: ConditionKind;
  signal: string;
  source: "Saved gym" | "Live session" | "Apple Health";
  sourceLabel: string;
  description: string;
  requiresSavedGym?: true;
  requiresAppleHealth?: true;
};

export const conditionCatalog = [
  { id: "gym-arrive", group: "Gym", label: "Arrive at gym", kind: "event", signal: "savedGymPresence", source: "Saved gym", sourceLabel: "Saved gym presence", description: "Check in at a saved gym and earn once.", requiresSavedGym: true },
  { id: "gym-present", group: "Gym", label: "Be at the gym", kind: "state", signal: "savedGymPresence", source: "Saved gym", sourceLabel: "Saved gym presence", description: "Keep apps open while you remain at the gym.", requiresSavedGym: true },
  { id: "gym-time", group: "Gym", label: "Time at the gym", kind: "rate", signal: "minutesPresent", source: "Saved gym", sourceLabel: "Minutes present", description: "Exchange time at a saved gym for screen time.", requiresSavedGym: true },
  { id: "walk-state", group: "Walking", label: "While walking", kind: "state", signal: "liveWalking", source: "Live session", sourceLabel: "Live walking", description: "Keep apps open while you keep moving." },
  { id: "walk-steps-rate", group: "Walking", label: "Steps exchange", kind: "rate", signal: "steps", source: "Apple Health", sourceLabel: "Steps / Apple Health", description: "Turn today’s steps into screen time continuously.", requiresAppleHealth: true },
  { id: "walk-steps-event", group: "Walking", label: "Step goal", kind: "event", signal: "steps", source: "Apple Health", sourceLabel: "Steps / Apple Health", description: "Earn once when today’s step goal is reached.", requiresAppleHealth: true },
  { id: "run-distance-event", group: "Running", label: "Distance goal", kind: "event", signal: "runningDistance", source: "Apple Health", sourceLabel: "Running distance / Apple Health", description: "Earn once when a recorded run reaches your distance.", requiresAppleHealth: true },
  { id: "run-distance-rate", group: "Running", label: "Distance exchange", kind: "rate", signal: "runningDistance", source: "Apple Health", sourceLabel: "Running distance / Apple Health", description: "Exchange recorded running distance for screen time.", requiresAppleHealth: true },
  { id: "cycle-distance-event", group: "Cycling", label: "Distance goal", kind: "event", signal: "cyclingDistance", source: "Apple Health", sourceLabel: "Cycling distance / Apple Health", description: "Earn once when a recorded ride reaches your distance.", requiresAppleHealth: true },
  { id: "cycle-distance-rate", group: "Cycling", label: "Distance exchange", kind: "rate", signal: "cyclingDistance", source: "Apple Health", sourceLabel: "Cycling distance / Apple Health", description: "Exchange recorded cycling distance for screen time.", requiresAppleHealth: true },
  { id: "swim-distance-event", group: "Swimming", label: "Distance goal", kind: "event", signal: "swimmingDistance", source: "Apple Health", sourceLabel: "Swimming distance / Apple Health", description: "Earn once when a recorded swim reaches your distance.", requiresAppleHealth: true },
  { id: "swim-distance-rate", group: "Swimming", label: "Distance exchange", kind: "rate", signal: "swimmingDistance", source: "Apple Health", sourceLabel: "Swimming distance / Apple Health", description: "Exchange recorded swimming distance for screen time.", requiresAppleHealth: true },
  { id: "calories-event", group: "Any activity", label: "Active-calorie goal", kind: "event", signal: "activeCalories", source: "Apple Health", sourceLabel: "Active calories / Apple Health", description: "Earn once when today’s active-calorie goal is reached.", requiresAppleHealth: true },
  { id: "calories-rate", group: "Any activity", label: "Active-calorie exchange", kind: "rate", signal: "activeCalories", source: "Apple Health", sourceLabel: "Active calories / Apple Health", description: "Exchange active calories for screen time.", requiresAppleHealth: true },
  { id: "active-minutes-event", group: "Any activity", label: "Active-minutes goal", kind: "event", signal: "activeMinutes", source: "Apple Health", sourceLabel: "Active minutes / Apple Health", description: "Earn once when today’s active-minutes goal is reached.", requiresAppleHealth: true },
  { id: "active-minutes-rate", group: "Any activity", label: "Active-minutes exchange", kind: "rate", signal: "activeMinutes", source: "Apple Health", sourceLabel: "Active minutes / Apple Health", description: "Exchange active minutes for screen time.", requiresAppleHealth: true },
  { id: "workout-duration-event", group: "Any activity", label: "Finish any workout", kind: "event", signal: "workoutDuration", source: "Apple Health", sourceLabel: "Workout duration / Apple Health", description: "Earn after any recorded workout lasts at least your chosen time.", requiresAppleHealth: true },
] as const satisfies readonly ConditionCatalogEntry[];

export const conditionCatalogCopy = {
  title: "Choose a way to earn",
  body: "Pick the outcome that feels natural. The condition kind stays behind the scenes.",
  filters: ["All", "Gym", "Walking", "Running", "Cycling", "Swimming", "Any activity"],
  disabledRowLink: "Why unavailable?",
  disabledReasons: {
    duplicate: "Already added for this source and place.",
    taken: "Already in your Conditions.",
    conflict: "Unavailable while {conditionName} is active. Both would reward the same activity.",
    appleHealth: "Connect the Apple Health demo state to configure this condition.",
    savedGym: "Add a gym before choosing this condition.",
    gymLimit: "You can keep up to 5 saved gyms.",
  },
  discardAlert: {
    title: "Discard this condition?",
    body: "Your unfinished choices will be removed from this demo.",
    actions: ["Keep editing", "Discard"],
  },
} as const;

export const builderSteps = [
  { id: "catalog", title: "Choose a way to earn", body: "Pick the outcome that feels natural.", primary: null },
  { id: "place", title: "Choose a gym", body: "Select a saved place or add a sample gym.", primary: "Next" },
  { id: "configure-state", title: "Set the walking rule", body: "Choose a grace period and, if useful, an active window.", primary: "Next" },
  { id: "configure-rate", title: "Set the exchange", body: "Choose how many minutes this signal adds. Nothing is prefilled.", primary: "Next" },
  { id: "configure-event", title: "Set the goal", body: "Choose the threshold that makes this count. Nothing is prefilled.", primary: "Next" },
  { id: "reward", title: "Choose the reward", body: "Decide what one completed event adds or opens.", primary: "Next" },
  { id: "banner", title: "Choose card artwork", body: "Pick the banner this condition will wear on Home and Manage.", primary: "Next" },
  { id: "preview", title: "Preview your condition", body: "This is the exact card that will appear on Home.", primary: "Save condition" },
  { id: "edit", title: "Edit condition", body: "Changes update this condition everywhere in the demo.", primary: "Done" },
] as const;

export const builderOptions = {
  initialEconomyValue: null,
  stateGrace: [
    { value: 30, label: "30 sec" },
    { value: 60, label: "1 min" },
    { value: 120, label: "2 min" },
    { value: 180, label: "3 min" },
    { value: 240, label: "4 min" },
    { value: 300, label: "5 min" },
  ],
  rateMinutes: { min: 5, max: 60, step: 5, initial: null },
  rateQuanta: {
    steps: { metric: "1,000 steps", example: "1,000 steps = 20 min" },
    runningMetric: { metric: "1 km", example: "1 km = 15 min" },
    runningImperial: { metric: "1 mi", example: "1 mi = 15 min" },
    cyclingMetric: { metric: "5 km", example: "5 km = 10 min" },
    cyclingImperial: { metric: "3 mi", example: "3 mi = 10 min" },
    swimmingMetric: { metric: "100 m", example: "100 m = 5 min" },
    swimmingImperial: { metric: "100 yd", example: "100 yd = 5 min" },
    activeCalories: { metric: "100 kcal", example: "100 kcal = 10 min" },
    activeMinutes: { metric: "10 active min", example: "10 active min = 10 min" },
    gymTime: { metric: "10 min present", example: "10 min at the gym = 5 min" },
  },
  eventThresholds: {
    steps: { min: 1000, max: 30000, step: 500, unit: "steps", initial: null },
    runMetric: { min: 1, max: 42, step: 0.5, unit: "km", initial: null },
    runImperial: { min: 1, max: 26, step: 0.5, unit: "mi", initial: null },
    cycleMetric: { min: 5, max: 200, step: 5, unit: "km", initial: null },
    cycleImperial: { min: 3, max: 120, step: 3, unit: "mi", initial: null },
    swim: { min: 100, max: 5000, step: 100, unit: "m", initial: null },
    activeCalories: { min: 50, max: 2000, step: 50, unit: "kcal", initial: null },
    activeMinutes: { min: 10, max: 180, step: 5, unit: "min", initial: null },
    workoutDuration: { min: 10, max: 120, step: 5, unit: "min", initial: null },
    gymArrival: { thresholdless: true, initial: null },
  },
  eventRewards: {
    choices: [
      { id: "fixed", label: "Add a fixed amount", subtitle: "Add 5–120 minutes to today’s balance." },
      { id: "rest-of-day", label: "Open for the rest of today", subtitle: "Keep the selected apps open until the day boundary." },
      { id: "set-period", label: "Open for a set period", subtitle: "Keep the selected apps open for 15 minutes–4 hours." },
    ],
    fixedMinutes: { min: 5, max: 120, step: 5, initial: null },
    setPeriodMinutes: { min: 15, max: 240, step: 15, initial: null },
    perDayCap: { min: 1, max: 10, terminal: "Unlimited", initial: null },
    cooldown: { off: "Off", min: 15, max: 480, step: 15, initial: null },
    repeatable: { values: ["No", "Yes"], initial: null },
  },
  activeWindow: {
    modes: ["Anytime", "Start time only", "End time only", "Start and end"],
    initial: "Anytime",
    guidedStart: "7:00 AM",
    guidedEnd: "10:00 PM",
  },
} as const;

export const builderAlerts = {
  delete: {
    title: "Delete “{conditionName}”?",
    body: "The condition will leave Home and Manage. Past sample Analysis entries stay in place.",
    actions: ["Cancel", "Delete"],
  },
  disableHelper: "Turning a condition off keeps its sample history and settings. It simply leaves today’s earning paths.",
} as const;

export const savedGymFixtures = [
  { id: "harbor-strength", name: "Harbor Strength", subtitle: "0.4 mi away · Sample place", radiusMeters: 100, tag: "Verified gym" },
  { id: "northside", name: "Northside Community Gym", subtitle: "1.8 mi away · Sample place", radiusMeters: 100, tag: "Honor system" },
] as const;

export const placePickerCopy = {
  actions: ["Add a gym", "Cancel", "Save place"],
  searchPlaceholder: "Search sample places",
  radiusValues: [50, 75, 100, 125, 150, 175, 200],
  radiusHelper: "A wider radius is easier to detect but less precise.",
  disclosure: "No map, search, pin, Wi‑Fi, or location service is used.",
} as const;

export const bannerOptions = [
  { family: "Gym", options: [
    { id: "gym-weights-floor", label: "Weights floor", assetKey: "gymWeightsFloor" },
    { id: "gym-squat-rack", label: "Squat rack", assetKey: "gymSquatRack" },
    { id: "gym-sunset-gym", label: "Sunset gym", assetKey: "gymSunsetGym" },
    { id: "gym-cable-row", label: "Cable row", assetKey: "gymCableRow" },
  ] },
  { family: "Running", options: [
    { id: "run-road-dawn", label: "Road at dawn", assetKey: "runRoadDawn" },
    { id: "run-track", label: "Track lights", assetKey: "runTrack" },
    { id: "run-forest-trail", label: "Forest trail", assetKey: "runForestTrail" },
  ] },
  { family: "Walking", options: [
    { id: "walk-city-sidewalk", label: "City sidewalk", assetKey: "walkCitySidewalk" },
    { id: "walk-park-path", label: "Park path", assetKey: "walkParkPath" },
    { id: "walk-night-walk", label: "Night walk", assetKey: "walkNightWalk" },
  ] },
  { family: "Cycling", options: [
    { id: "cycle-open-road", label: "Open road", assetKey: "cycleOpenRoad" },
    { id: "cycle-mountain-climb", label: "Mountain climb", assetKey: "cycleMountainClimb" },
    { id: "cycle-city-commute", label: "City commute", assetKey: "cycleCityCommute" },
  ] },
  { family: "Swimming", options: [
    { id: "swim-pool-lanes", label: "Pool lanes", assetKey: "swimPoolLanes" },
    { id: "swim-open-water", label: "Open water", assetKey: "swimOpenWater" },
    { id: "swim-underwater-light", label: "Underwater light", assetKey: "swimUnderwaterLight" },
  ] },
  { family: "General", options: [
    { id: "general-abstract-energy", label: "Abstract energy", assetKey: "generalAbstractEnergy" },
    { id: "general-sunrise", label: "Sunrise", assetKey: "generalSunrise" },
    { id: "general-city-motion", label: "City motion", assetKey: "generalCityMotion" },
    { id: "general-rain-window", label: "Rain window", assetKey: "generalRainWindow" },
    { id: "general-mountain-silhouette", label: "Mountain silhouette", assetKey: "generalMountainSilhouette" },
  ] },
  { family: "User", options: [{ id: "user-photo", label: "Use your own photo", assetKey: null }] },
] as const;

export const photoPickerDisclosure = "Prototype preview — no photo library opens and no image is imported.";

export const showcaseConditions = [
  { id: "demo-gym", cardName: "Go to gym", catalogEntry: "Arrive at gym", rule: "Harbor Strength · add 30 min · once daily · 4 h cooldown · 6:00 AM–10:00 PM", today: "Ready" },
  { id: "demo-walk", cardName: "While walking", catalogEntry: "While walking", rule: "Apps stay open while moving · normal drain · 2 min grace · 7:00 AM–10:00 PM", today: "Inactive" },
  { id: "demo-steps", cardName: "Steps exchange", catalogEntry: "Steps exchange", rule: "1,000 steps = 20 min · continuous · Anytime", today: "6,240 steps · 2h 05m credited" },
] as const;
