export const workoutCopy = {
  G1: { title: 'What counts at the gym?', body: "You'll pick your gym after setup." },
  G2: { title: 'How long at the gym?', body: 'Choose a goal that fits your day.' },
  R1: { title: 'What counts as a run?', body: 'Choose the kind of goal that keeps you moving.' },
  R2: { title: 'Set your running goal', body: 'A little movement goes a long way.' },
  B1: { title: 'What counts as a bike ride?', body: 'Choose the kind of goal that keeps you moving.' },
  B2: { title: 'Set your biking goal', body: 'Make room for a ride in your day.' },
  D: { title: 'Choose your distance', body: 'Type a distance that feels doable.' },
  modes: {
    gym: [
      { id: 'time', title: 'Spend time at the gym' },
      { id: 'arrival', title: 'Arrive at the gym' },
    ],
    running: [
      { id: 'minutes', title: 'Run for a set time' },
      { id: 'distance', title: 'Run a set distance' },
    ],
    biking: [
      { id: 'minutes', title: 'Bike for a set time' },
      { id: 'distance', title: 'Bike a set distance' },
    ],
  },
  presets: { gym: [30, 45, 60], running: [15, 20, 30], biking: [20, 30, 45] },
  minutes: 'minutes',
  goal: 'Goal',
  distance: 'Distance',
  preset: (value: number) => `${value} minutes`,
  range: (min: number, max: number, unit: string) => `Choose ${min}–${max} ${unit}.`,
  support: 'Unlocks your apps for the rest of the day',
} as const;
