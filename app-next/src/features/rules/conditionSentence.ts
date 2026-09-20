import { Answers } from '../../onboarding/types';
import { Schedule } from '../../domain/types';
import { minuteLabel } from '../../domain/scheduleLabel';
import { domainCopy } from '../../content/domain';
import { conditionPreviewCopy as c } from '../../content/conditionPreview';
import { RuleDraft } from './draft';

const answered = (value: unknown) => value !== undefined && value !== '' && Number.isFinite(Number(value));
const number = (value: number) => value.toLocaleString('en-US');

/** The window and days, appended once the schedule question is on screen. */
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

/**
 * Plain English for the condition as it is being built. Until the user chooses a value,
 * the sentence uses the visible control's default so the preview is always complete.
 */
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
  // Before the mode question the draft default stands in, so the card is on every step of the flow.
  if (d.activity === 'walking') {
    if (d.walkingMode === 'state') return c.unless(c.walking);
    if (d.walkingMode === 'minutes') return c.until(c.walkMinutes(number(d.walkMinutes)));
    return c.until(c.steps(number(d.stepGoal)));
  }
  if (d.activity === 'gym') {
    if (d.gymMode === 'arrival' || d.gymMode === 'presence') return c.unless('are at the gym');
    return c.untilSpent(goalChosen || answered(a.gymMinutes) ? c.minutes(number(d.gymMinutes)) : 'time', c.gym);
  }
  return null;
}
