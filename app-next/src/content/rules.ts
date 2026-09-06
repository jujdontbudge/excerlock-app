export const walkingCopy = {
  W1: { title: 'Where will you walk?', body: 'Choose what fits your day.' },
  W2: { title: 'How should walking unlock your apps?', body: 'Choose the kind of nudge you need.' },
  W3: { title: 'Set your walking goal', body: 'Build a little movement into every day.' },
  places: [
    { id: 'outside', title: 'Outside', support: 'Get some fresh air with your steps.' },
    { id: 'treadmill', title: 'Treadmill', support: 'Keep moving, whatever the weather.' },
    { id: 'either', title: 'Either', support: 'A little of both works too.' },
  ],
  modes: [
    { id: 'target', title: 'Reach a step goal', support: 'Unlocks your apps for the rest of the day' },
    { id: 'state', title: 'Unlock while walking', support: 'Apps open while you walk, close when you stop' },
  ],
  goal: 'Daily step goal',
  unit: 'steps',
  add: 'Add 500 steps',
  remove: 'Remove 500 steps',
  helper: (steps: number) => `About ${Math.round(steps / 100 / 5) * 5} minutes of walking`,
  range: 'Choose 500–30,000 steps, in increments of 500.',
} as const;
