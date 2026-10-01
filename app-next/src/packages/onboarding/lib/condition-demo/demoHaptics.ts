import type { HapticIntent } from '../../../ui/haptics';

type DemoFrame = { time: number; locked: boolean; goalMet: boolean; progressFraction: number };
export type DemoCues = { previous: DemoFrame | null; lockShown: boolean; finished: boolean };

const firstLockAfter = 0.4;
const progressMarks = [1 / 3, 2 / 3];

export function freshDemoCues(): DemoCues {
  return { previous: null, lockShown: false, finished: false };
}

function cueFor(cues: DemoCues, previous: DemoFrame | null, next: DemoFrame, reduced: boolean): HapticIntent {
  if (!previous) return 'none';
  if (previous.locked && !next.locked) return 'unlock';
  if (reduced) return 'none';
  if (!previous.locked && next.locked) return 'lock';
  if (next.locked && !cues.lockShown && next.time >= firstLockAfter) return 'lock';
  const crossed = progressMarks.some(
    (mark) => previous.progressFraction < mark && next.progressFraction >= mark,
  );
  return crossed && !next.goalMet ? 'detent' : 'none';
}

export function nextDemoCue(cues: DemoCues, next: DemoFrame, reduced: boolean): HapticIntent {
  if (cues.finished) return 'none';
  const previous = cues.previous;
  if (previous && next.time < previous.time) {
    cues.finished = true;
    return 'none';
  }
  const cue = cueFor(cues, previous, next, reduced);
  cues.previous = next;
  if (cue === 'lock' || cue === 'unlock') cues.lockShown = true;
  return cue;
}
