import { IconName } from '../../icons/Icon';
import { rulePreviewCopy as c } from '../../content/rulePreview';
import { RuleDraft } from './draft';

export type RulePreviewModel = { message: string; progress: string; icon: IconName };
const number = (value: number) => value.toLocaleString('en-US', { maximumFractionDigits: 1 });

export function rulePreviewModel(draft: RuleDraft): RulePreviewModel {
  if (draft.activity === 'walking') {
    if (draft.walkingMode === 'state')
      return { message: c.block(c.walkingState), progress: c.walkingWaiting, icon: 'walking' };
    const goal = number(draft.stepGoal);
    return { message: c.block(c.walkingTarget(goal)), progress: c.progress(goal, 'steps'), icon: 'walking' };
  }
  if (draft.activity === 'gym') {
    if (draft.gymMode === 'arrival')
      return { message: c.block(c.gymArrival), progress: c.gymWaiting, icon: 'gym' };
    const goal = number(draft.gymMinutes);
    return { message: c.block(c.gymTime(goal)), progress: c.progress(goal, 'minutes'), icon: 'gym' };
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
    message: c.block(condition),
    progress: c.progress(goal, draft.runMode === 'distance' ? draft.unit : 'minutes'),
    icon: draft.activity,
  };
}
