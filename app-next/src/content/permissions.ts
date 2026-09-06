export const permissionCopy = {
  screenTime: {
    title: 'Let ExcerLock manage Screen Time?',
    body: 'Use your selected apps and categories with your exercise rules.',
  },
  motion: { title: 'Let ExcerLock use Motion & Fitness?', body: 'Count your steps toward your walking goals.' },
  location: { title: 'Let ExcerLock use your location?', body: 'Recognize when you arrive at your saved gym.' },
  health: { title: 'Let ExcerLock read your workouts?', body: 'Use running and biking workouts toward your goals.' },
  camera: {
    title: 'Let ExcerLock use your camera?',
    body: 'Check your walking movement when your phone is propped up.',
  },
  notifications: { title: 'Allow ExcerLock to send notifications?', body: 'Get a reminder before your trial ends.' },
} as const;
