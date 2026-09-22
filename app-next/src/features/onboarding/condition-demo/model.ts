import type { RuleDraft } from '../../rules/draft';

export type Scenario = {
  kind: 'walk-state' | 'walk-steps' | 'walk-minutes' | 'gym-arrival' | 'gym-minutes';
  place: 'outside' | 'treadmill';
  goal: number;
};
export type Phase = { name: string; duration: number };
export type DemoState = {
  time: number;
  walkTime: number;
  distance: number;
  manual: null | 'walking' | 'blocked';
  manualTime: number;
};
export function scenarioFor(draft: RuleDraft, places: string): Scenario {
  return {
    kind:
      draft.activity === 'gym'
        ? draft.gymMode === 'arrival'
          ? 'gym-arrival'
          : 'gym-minutes'
        : `walk-${draft.walkingMode}`,
    place:
      draft.activity === 'walking' && draft.walkingMode === 'state' && places.includes('treadmill')
        ? 'treadmill'
        : 'outside',
    goal:
      draft.activity === 'gym'
        ? draft.gymMode === 'arrival'
          ? 0
          : draft.gymMinutes
        : draft.walkingMode === 'steps'
          ? draft.stepGoal
          : draft.walkingMode === 'minutes'
            ? draft.walkMinutes
            : 0,
  };
}
export function phasesFor(s: Scenario): Phase[] {
  'worklet';
  if (s.kind === 'walk-state')
    return [
      ...(s.place === 'treadmill'
        ? [
            { name: 'prop', duration: 2 },
            { name: 'scan', duration: 3 },
          ]
        : []),
      { name: 'walking', duration: 5 },
      { name: 'blocked', duration: 3 },
    ];
  if (s.kind.startsWith('walk'))
    return [
      { name: 'walking', duration: 7 },
      { name: 'unlocked', duration: 4 },
    ];
  return [
    { name: 'approach', duration: 4 },
    { name: 'confirming', duration: 3 },
    ...(s.kind === 'gym-minutes'
      ? [
          { name: 'counting', duration: 6 },
          { name: 'unlocked', duration: 3 },
        ]
      : [{ name: 'unlocked', duration: 4 }]),
    { name: 'leave', duration: 2 },
  ];
}
export function initialDemo(): DemoState {
  'worklet';
  return { time: 0, walkTime: 0, distance: 0, manual: null, manualTime: 0 };
}
export function phaseAt(time: number, s: Scenario) {
  'worklet';
  const phases = phasesFor(s);
  const total = phases.reduce((n, p) => n + p.duration, 0);
  const t = ((time % total) + total) % total;
  let start = 0;
  for (let index = 0; index < phases.length; index++) {
    const phase = phases[index];
    if (t < start + phase.duration) return { ...phase, index, start, local: t - start, total };
    start += phase.duration;
  }
  return { ...phases[0], index: 0, start: 0, local: 0, total };
}
function ease(p: number) {
  'worklet';
  return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
}
export function snapshot(state: DemoState, s: Scenario) {
  'worklet';
  const auto = phaseAt(state.time, s);
  const phase = state.manual ?? auto.name;
  const local = state.manual ? state.manualTime : auto.local;
  const p = Math.min(1, local / auto.duration);
  const walking = phase === 'walking' || phase === 'scan';
  const locked =
    phase === 'prop' ||
    phase === 'scan' ||
    phase === 'blocked' ||
    phase === 'approach' ||
    phase === 'confirming' ||
    (phase === 'walking' && s.kind !== 'walk-state');
  const phone = phase === 'prop' || phase === 'scan' ? 'excerlock' : locked ? 'shield' : 'tiktok';
  const goalMet = phase === 'unlocked' || phase === 'leave';
  const increment = s.kind === 'walk-steps' && s.goal >= 50 ? 50 : 1;
  const fraction = s.kind.startsWith('walk') ? ease(p) : p;
  const progress = goalMet
    ? s.goal
    : phase === 'walking' || phase === 'counting'
      ? Math.min(s.goal - increment, Math.max(0, Math.floor((s.goal * fraction) / increment) * increment))
      : 0;
  let title = locked
    ? 'Apps are blocked'
    : s.kind === 'walk-state'
      ? 'Unlocked while you walk'
      : 'Unlocked for the rest of today';
  let caption = '';
  if (phase === 'prop') {
    title = 'Phone propped on the console';
    caption = 'Set the phone upright, facing you';
  } else if (phase === 'scan') {
    title = 'Reading your stride';
    caption = 'Keep walking a few seconds';
  } else if (phase === 'confirming') {
    title = "Confirming you're here";
    caption = 'Stay put for a moment.';
  } else if (phase === 'counting') {
    title = 'Unlocked while at the gym';
    caption = 'Your gym time is counting';
  } else if (s.kind === 'walk-state')
    caption = locked
      ? 'Stopped — your apps lock right away. Walk to open them'
      : s.place === 'treadmill'
        ? 'Unlocked while your phone stays in place'
        : 'Apps open while you walk';
  else if (s.kind.startsWith('walk'))
    caption = locked
      ? s.kind === 'walk-steps'
        ? 'Your steps count all day, with or without ExcerLock open'
        : 'Your walking minutes add up through the day'
      : 'Unlocks your apps for the rest of the day';
  else
    caption =
      phase === 'approach'
        ? 'Walking to the gym'
        : phase === 'leave'
          ? 'Today stays unlocked'
          : 'Location detected at the gym';
  const mapFraction = phase === 'approach' ? ease(p) * 0.995 : phase === 'leave' ? 1 - ease(p) * 0.6 : 1;
  return {
    time: state.time,
    manual: state.manual,
    phase,
    local,
    p,
    total: auto.total,
    phaseIndex: auto.index,
    walking,
    locked,
    phone,
    statusLocked: locked && phone !== 'excerlock',
    progress,
    progressFraction: goalMet ? 1 : Math.min(0.9999, fraction),
    title,
    caption,
    mapFraction,
    goalMet,
  };
}
export function beginHold(state: DemoState, s: Scenario): DemoState {
  'worklet';
  if (s.kind !== 'walk-state' || state.manual === 'walking') return state;
  const current = snapshot(state, s);
  return { ...state, manual: 'walking', manualTime: current.phase === 'walking' ? current.local : 0 };
}
export function endHold(state: DemoState): DemoState {
  'worklet';
  return state.manual === 'walking' ? { ...state, manual: 'blocked', manualTime: 0 } : state;
}
export function advanceDemo(state: DemoState, s: Scenario, seconds: number): DemoState {
  'worklet';
  let next = { ...state };
  let remaining = Math.max(0, seconds);
  // Split at phase boundaries: stride and scenery never accumulate stopped time.
  while (remaining > 0.0000001) {
    const phase = phaseAt(next.time, s);
    const boundary =
      next.manual === 'walking'
        ? remaining
        : next.manual === 'blocked'
          ? 3 - next.manualTime
          : phase.duration - phase.local;
    const dt = Math.min(remaining, Math.max(0.0000001, boundary));
    if (snapshot(next, s).walking) {
      next.walkTime += dt;
      next.distance += dt * 60;
    }
    if (next.manual) {
      next.manualTime += dt;
      if (next.manual === 'blocked' && next.manualTime >= 3 - 0.0000001) {
        next.manual = null;
        next.manualTime = 0;
        next.time = s.place === 'treadmill' ? 5 : 0;
      }
    } else next.time = (next.time + dt) % phase.total;
    remaining -= dt;
  }
  return next;
}
export function stride(walkTime: number) {
  'worklet';
  const frames = [2, 1, 4, 6, 2, 3, 5, 3];
  const x = walkTime * 9,
    i = Math.floor(x);
  return { first: frames[i % 8], second: frames[(i + 1) % 8], mix: x - i };
}
