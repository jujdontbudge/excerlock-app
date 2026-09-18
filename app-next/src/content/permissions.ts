export const alwaysLocationCopy = {
  title: 'Allow location access all the time?',
  body: 'Automatically recognize gym arrivals even when ExcerLock is closed.',
};
export const permissionCopy = {
  screenTime: {
    title: 'Let ExcerLock manage Screen Time?',
    body: 'Use your selected apps and categories with your exercise rules.',
  },
  motion: { title: 'Let ExcerLock use Motion & Fitness?', body: 'Count your steps toward your walking goals.' },
  location: { title: 'Let ExcerLock use your location?', body: 'Recognize when you arrive at your saved gym.' },
  camera: {
    title: 'Let ExcerLock use your camera?',
    body: 'Check your walking movement when your phone is propped up.',
  },
  notifications: { title: 'Allow ExcerLock to send notifications?', body: 'Get a reminder before your trial ends.' },
} as const;
export const lockListCopy = {
  deniedTitle: 'Screen Time is off',
  deniedBody: 'Turn on Screen Time access for ExcerLock in Settings to choose the apps to lock.',
  failedTitle: 'Could not open the app picker',
  openSettings: 'Open Settings',
  notNow: 'Not now',
  ok: 'OK',
} as const;
