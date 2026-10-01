export const systemAlertCopy = {
  screenTime: {
    title: '“ExcerLock” Would Like to Access Screen Time',
    message:
      'Providing “ExcerLock” access to Screen Time may allow it to see your activity data, restrict content, and limit the usage of apps and websites.',
    buttons: ['Continue', 'Don’t Allow'],
    tap: 0,
    deny: 1,
  },
  motion: {
    title: '“ExcerLock” would like to access your Motion & Fitness activity.',
    message: "ExcerLock uses Motion & Fitness data to count steps and detect walking for your Conditions.",
    buttons: ['Don’t Allow', 'Allow'],
    tap: 1,
    deny: 0,
  },
  location: {
    title: 'Allow “ExcerLock” to use your location?',
    message: 'Allow ExcerLock to support walking detection and recognize visits to your saved gyms.',
    buttons: ['Allow Once', 'Allow While Using App', 'Don’t Allow'],
    tap: 1,
    deny: 2,
  },
  alwaysLocation: {
    title: 'Allow “ExcerLock” to use your location?',
    message:
      'Allow ExcerLock to keep walk detection and gym auto-detect running while the app is closed, so exercise opens your apps without opening ExcerLock.',
    buttons: ['Allow Once', 'Allow While Using App', 'Don’t Allow'],
    tap: 1,
    deny: 2,
  },
  alwaysUpgrade: {
    title: 'Allow “ExcerLock” to also use your location even when you are not using the app?',
    message:
      'Allow ExcerLock to keep walk detection and gym auto-detect running while the app is closed, so exercise opens your apps without opening ExcerLock.',
    buttons: ['Keep Only While Using', 'Change to Always Allow'],
    tap: 1,
    deny: 0,
  },
  camera: {
    title: '“ExcerLock” would like to access the Camera.',
    message: 'Allow ExcerLock to use the front camera to verify treadmill walking while the app is open.',
    buttons: ['Don’t Allow', 'Allow'],
    tap: 1,
    deny: 0,
  },
  notifications: {
    title: '“ExcerLock” Would Like to Send You Notifications',
    message: 'Notifications may include alerts, sounds, and icon badges. These can be configured in Settings.',
    buttons: ['Don’t Allow', 'Allow'],
    tap: 1,
    deny: 0,
  },
} as const;
