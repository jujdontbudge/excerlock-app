export const setupCopy = {
  settings: 'Open Settings',
  notNow: 'Not now',
  flow: {
    apps: {
      title: 'Choose apps to lock',
      action: 'Continue',
      blocked: 'Screen Time is off for ExcerLock. Turn it on in Settings.',
    },
    motion: {
      title: 'Count your steps',
      action: 'Continue',
      blocked: 'Motion & Fitness is off for ExcerLock. Turn it on in Settings.',
    },
    walkLocation: {
      title: 'Unlock apps as you walk',
      action: 'Continue',
      blocked: 'Set Location to Always in Settings so a walk opens your apps while ExcerLock is closed.',
    },
    gymLocation: {
      title: 'Know when you are at the gym',
      action: 'Continue',
      blocked: 'Location is off for ExcerLock. Turn it on in Settings.',
    },
    gym: {
      title: 'Pick your gym',
      body: 'Only visits to your gym count.',
      action: 'Choose gym',
      blocked: '',
    },
  },
  tap: (button: string) => `Tap “${button}”`,
} as const;
