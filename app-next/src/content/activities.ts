export const activities = [
  { id: 'walking', title: 'Walking', support: 'Find your daily stride' },
  { id: 'gym', title: 'Gym', support: 'Show up for yourself' },
  { id: 'running', title: 'Running', support: 'Make every run count' },
  { id: 'biking', title: 'Biking', support: 'Enjoy the ride' },
] as const;
export type ActivityId = (typeof activities)[number]['id'];
