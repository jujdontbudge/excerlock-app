import { Answers } from '../../onboarding/types';
import { Schedule } from '../../domain/types';
import { minuteLabel } from '../../domain/scheduleLabel';
import { domainCopy } from '../../content/domain';
import { conditionPreviewCopy as c } from '../../content/conditionPreview';
import { RuleDraft } from './draft';

const answered = (value: unknown) => value !== undefined && value !== '' && Number.isFinite(Number(value));
const number = (value: number) => (Number.isFinite(value) ? value.toLocaleString('en-US') : c.blank);

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
 * Plain English for the condition as it is being built. Answers the user has not reached
 * yet read as a blank, so the same sentence can carry from the mode question to the goal
 * question and on to the schedule. Null until the first dependency is chosen.
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

/** On the goal question itself the wheel already stands on a value, so it is no longer a blank. */
function conditionClause(a: Answers, d: RuleDraft, goalChosen: boolean): string | null {
  const known = (value: unknown) => goalChosen || answered(value);
  if (d.activity === 'walking') {
    const place = a.walkPlace !== undefined,
      mode = a.walkingMode !== undefined;
    if (!place && !mode) return null;
    const where = place ? c.places[d.place] : '';
    if (mode && d.walkingMode === 'state') return c.unless(c.walking + where);
    return c.until(c.steps(known(a.stepGoal) ? number(d.stepGoal) : c.blank) + where);
  }
  if (d.activity === 'gym') {
    if (a.gymMode === undefined) return null;
    if (d.gymMode === 'arrival') return c.until(c.gymArrival);
    return c.until(c.spendAt(known(a.gymMinutes) ? c.minutes(number(d.gymMinutes)) : c.blank, c.gym));
  }
  const biking = d.activity === 'biking',
    prefix = biking ? 'bike' : 'run';
  if (a[prefix + 'Mode'] === undefined) return null;
  if (d.runMode === 'distance') {
    const distance = known(a[prefix + 'Distance']) ? number(d.distance) : c.blank;
    return c.until((biking ? c.bike : c.run)(`${distance} ${d.unit}`));
  }
  const amount = known(a[prefix + 'Minutes']) ? c.minutes(number(d.minutes)) : c.blank;
  return c.until(c.spendDoing(amount, biking ? c.biking : c.running));
}
