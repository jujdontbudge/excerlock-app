export const setupCopy = {
  settings: 'Open Settings',
  notNow: 'Not now',
  retry: "That didn't work. Please try again.",
  chooseBody: 'Choose the distracting apps and categories your Conditions will lock.',
  choose: 'Choose apps',
  change: 'Change apps',
  continue: 'Continue',
  selected: 'Locked apps',
  privacy: 'Your choices stay on your iPhone.',
  summary: (apps: number, categories: number, websites = 0) => `${apps} ${apps === 1 ? 'app' : 'apps'} · ${categories} ${categories === 1 ? 'category' : 'categories'}${websites > 0 ? ` · ${websites} ${websites === 1 ? 'website' : 'websites'}` : ''}`,
  flow: {
    screenTime: {
      title: 'Allow Screen Time',
      action: 'Continue',
      blocked: 'Screen Time is off for ExcerLock. Turn it on in Settings.',
    },
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
