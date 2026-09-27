import { Answers } from '../model/answers';
import { Schedule } from '../model/types';
import { minuteLabel } from '../schedule/scheduleLabel';
import { domainCopy } from '../schedule/domainCopy';
import { conditionPreviewCopy as c } from './lib/conditionPreviewCopy';
import { RuleDraft } from './draft';
import { isValidStepGoal } from './stepGoal';

const answered = (value: unknown) => value !== undefined && value !== '' && Number.isFinite(Number(value));
const number = (value: number) => value.toLocaleString('en-US');

function scheduleTail(schedule: Schedule): string {
  const window =
    schedule.window.kind === 'allDay'
      ? c.allDay
      : c.window(minuteLabel(schedule.window.startMinute), minuteLabel(schedule.window.endMinute));
  const days = [...schedule.days].sort((a, b) => (a || 7) - (b || 7));
  const when =
    days.length === 7
      ? c.everyDay
      : days.join(',') === '1,2,3,4,5'
        ? c.weekdays
        : c.onDays(days.map((day) => domainCopy.days[day]).join(', '));
  return window + when;
}

export function conditionSentence(
  answers: Answers,
  draft: RuleDraft,
  { schedule, goalChosen = false }: { schedule?: Schedule; goalChosen?: boolean } = {},
): string | null {
  const tail = schedule ? scheduleTail(schedule) : '';
  const sentence = conditionClause(answers, draft, goalChosen);
  return sentence === null ? null : sentence + tail;
}

function conditionClause(a: Answers, d: RuleDraft, goalChosen: boolean): string | null {
  if (d.activity === 'walking') {
    if (d.walkingMode === 'state') return c.unless(c.walking);
    if (d.walkingMode === 'minutes') return Number.isInteger(d.walkMinutes) && d.walkMinutes >= 5 && d.walkMinutes <= 180 ? c.until(c.walkMinutes(number(d.walkMinutes))) : null;
    return isValidStepGoal(d.stepGoal) ? c.until(c.steps(number(d.stepGoal))) : null;
  }
  if (d.activity === 'gym') {
    if (d.gymMode === 'arrival' || d.gymMode === 'presence') return c.unless('are at the gym');
    return c.untilSpent(goalChosen || answered(a.gymMinutes) ? c.minutes(number(d.gymMinutes)) : 'time', c.gym);
  }
  return null;
}
