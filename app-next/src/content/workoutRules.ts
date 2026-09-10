export const workoutCopy = {
  G1: { title: 'What counts at the gym?', body: "You'll pick your gym after setup." },
  G2: { title: 'How long at the gym unlocks your phone?', body: 'Choose a goal that fits your day.' },
  modes: {
    gym: [
      { id: 'time', title: 'Spend time at the gym' },
      { id: 'arrival', title: 'Arrive at the gym' },
    ],
  },
  presets: { gym: [30, 45, 60] },
  minutes: 'minutes',
  goal: 'Goal',
  range: (min: number, max: number, unit: string) => `Choose ${min}–${max} ${unit}.`,
  support: 'Unlocks your apps for the rest of the day',
} as const;
