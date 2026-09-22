import { Icon } from '../../../icons/Icon';
import { tokens as t } from '../../../design-system/tokens';
export function GoalIcon({ goal, selected }: { goal: string; selected: boolean }) {
  return (
    <Icon
      name={goal === 'exercise' ? 'gym' : goal === 'screenTime' ? 'phone' : goal === 'other' ? 'more' : 'heart'}
      size={t.icon.lg}
      tint={selected ? t.text.onAccent : t.brand.primary}
    />
  );
}
