export const walkSessionStates = {
  ready: {
    title: "Ready to walk?",
    body: "Keep your phone with you and move at a natural pace. Apps would stay open only while movement holds.",
    statusRows: [
      { label: "Motion & Fitness", value: "Allowed in demo" },
      { label: "Location", value: "Allowed in demo" },
    ],
    operationalNote: "Balance drains normally.",
    actions: ["Start walking", "Cancel"],
    toggle: "Always show these tips",
  },
  verifying: {
    title: "Finding your walking rhythm…",
    body: "Looking for a steady sample cadence. No motion is being read.",
    actions: ["Cancel"],
  },
  active: {
    chip: "ACTIVE",
    title: "Walking",
    hero: "18:42",
    heroLabel: "elapsed",
    secondaryMetric: "2,146 steps",
    balanceLine: "7 min left · drains normally.",
    actions: ["Pause", "End session"],
  },
  paused: {
    title: "Walking paused.",
    body: "Your sample grace timer is ready.",
    actions: ["Resume", "End session"],
  },
  grace: {
    title: "Keep moving.",
    hero: "0:42",
    body: "Start walking again before the grace timer ends.",
    actions: ["Resume walking", "End session"],
  },
  endedByUser: {
    title: "Walk complete.",
    cause: "Ended by you.",
    values: [
      { label: "duration", value: "24:18" },
      { label: "steps", value: "2,804" },
      { label: "access kept open", value: "24 min" },
    ],
    actions: ["Done", "Start again", "Why did apps lock?"],
  },
  endedStopped: {
    title: "Walking ended.",
    cause: "You stopped walking.",
    body: "Your balance was empty, so the sample apps returned behind the lock.",
    actions: ["Done", "Keep walking", "Why did apps lock?"],
  },
  permissionLost: {
    title: "Walking couldn’t start.",
    body: "Motion & Fitness or Location needs attention in this demo state.",
    repair: "Review the permission preview, then try again.",
    actions: ["Instructions", "Try again", "Back"],
  },
} as const;

export const walkSessionAlerts = {
  pause: {
    title: "Pause walking?",
    body: "The grace timer will begin while the session is paused.",
    actions: ["Keep walking", "Pause"],
  },
  end: {
    title: "End this walking session?",
    body: "Apps may return behind the lock if your sample balance is empty.",
    actions: ["Keep walking", "End session"],
  },
  whyLocked: {
    title: "Why did apps lock?",
    body: "Walking keeps access open only while movement holds. It does not pause balance use or bank time. When walking ends with no balance left, the lock returns.",
    action: "Got it",
  },
} as const;

export const gymSessionStates = {
  ready: {
    title: "Check in at Harbor Strength.",
    body: "This preview checks a sample 100 m radius. No location is read.",
    statusLabel: "Location",
    statusOptions: ["Needs attention", "Allowed in demo"],
    actions: ["Check in", "Cancel"],
  },
  verifying: {
    title: "Checking your location…",
    body: "Harbor Strength · 100 m sample radius. No location service is running.",
    actions: ["Cancel"],
  },
  verified: {
    chip: "VERIFIED",
    title: "You’re at the gym.",
    body: "Go to gym added 30 minutes to the sample balance.",
    actions: ["Done", "View condition"],
  },
  failed: {
    title: "Couldn’t verify this check-in.",
    body: "The sample Location status may need attention, or the selected gym radius may be too small.",
    repair: "Your setup is still here.",
    actions: ["Instructions", "Try again", "Back"],
  },
} as const;

export const gymInstructions = {
  title: "Check the location preview",
  steps: [
    "Set Location to Allowed in demo.",
    "Confirm Harbor Strength is selected.",
    "Keep the sample radius at 100 m or wider.",
  ],
  body: "Nothing on this page reads your actual location.",
  primary: "Mark as fixed in demo",
  secondary: "Back",
} as const;
