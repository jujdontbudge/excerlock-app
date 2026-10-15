export const workoutCopy = {
  G1: { title: 'What unlocks your screen time?', body: "You'll pick your gym after setup." },
  G2: { title: 'How long at the gym unlocks your phone?', body: 'Choose a goal that fits your day.' },
  modes: {
    gym: [
      { id: 'arrival', title: 'Arrive at the gym' },
      { id: 'presence', title: 'Be at the gym' },
      { id: 'bank', title: 'Buy screen time', support: 'Gym minutes earn Points. Points buy time.' },
      { id: 'time', title: 'Spend time at the gym' },
    ],
  },
  presets: { gym: [30, 45, 60] },
  minutes: 'minutes',
  goal: 'Goal',
  range: (min: number, max: number, unit: string) => `Choose ${min}–${max} ${unit}.`,
  support: 'Unlocks your apps for the rest of the day',
} as const;
