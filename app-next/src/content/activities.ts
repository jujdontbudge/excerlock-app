export const activities = [
  { id: 'walking', title: 'Walking', support: 'Find your daily stride' },
  { id: 'gym', title: 'Gym', support: 'Show up for yourself' },
] as const;
export type ActivityId = (typeof activities)[number]['id'];
