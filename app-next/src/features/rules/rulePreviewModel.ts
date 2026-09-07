import { IconName } from '../../icons/Icon';
import { rulePreviewCopy as c } from '../../content/rulePreview';
import { Schedule } from '../../domain/types';
import { minuteLabel } from '../../domain/scheduleLabel';
import { RuleDraft } from './draft';

export type RulePreviewModel = { message: string; progress: string; icon: IconName };
const number = (value: number) => value.toLocaleString('en-US', { maximumFractionDigits: 1 });

export function rulePreviewModel(draft: RuleDraft, schedule?: Schedule): RulePreviewModel {
  const window = schedule?.window;
  const block = (condition: string) =>
    c.block(
      condition,
      window?.kind === 'allDay'
        ? c.allDay
        : window?.kind === 'range'
          ? c.range(minuteLabel(window.startMinute), minuteLabel(window.endMinute))
          : undefined,
    );
  if (draft.activity === 'walking') {
    if (draft.walkingMode === 'state')
      return { message: block(c.walkingState), progress: c.walkingWaiting, icon: 'walking' };
    const goal = number(draft.stepGoal);
    return { message: block(c.walkingTarget(goal)), progress: c.progress(goal, 'steps'), icon: 'walking' };
  }
  if (draft.activity === 'gym') {
    if (draft.gymMode === 'arrival') return { message: block(c.gymArrival), progress: c.gymWaiting, icon: 'gym' };
    const goal = number(draft.gymMinutes);
    return { message: block(c.gymTime(goal)), progress: c.progress(goal, 'minutes'), icon: 'gym' };
  }
  const goal = number(draft.runMode === 'distance' ? draft.distance : draft.minutes);
  const condition =
    draft.runMode === 'distance'
      ? draft.activity === 'running'
        ? c.runningDistance(goal, draft.unit)
        : c.bikingDistance(goal, draft.unit)
      : draft.activity === 'running'
        ? c.runningTime(goal)
        : c.bikingTime(goal);
  return {
    message: block(condition),
    progress: c.progress(goal, draft.runMode === 'distance' ? draft.unit : 'minutes'),
    icon: draft.activity,
  };
}
