import { Icon } from '../../../ui/Icon';
import { tokens as t } from '../../../ui/tokens';
export function GoalIcon({ goal, selected }: { goal: string; selected: boolean }) {
  return (
    <Icon
      name={goal === 'exercise' ? 'gym' : goal === 'screenTime' ? 'phone' : goal === 'other' ? 'more' : 'heart'}
      size={t.icon.lg}
      tone={selected ? 'onAccent' : 'accent'}
    />
  );
}
