import Svg, { Path } from 'react-native-svg';
import { tokens as t } from '../../../design-system/tokens';
import { profileTokens as p } from '../../../design-system/profileTokens';
import { activityPaths } from '../control/activityPaths';
import { goalPaths } from './goalPaths';
export function GoalIcon({ goal, selected }: { goal: string; selected: boolean }) {
  const icon = goal === 'exercise' ? activityPaths.dumbbell : goal === 'screenTime' ? goalPaths.phone : goalPaths.heart;
  return (
    <Svg accessible={false} width={p.icon.size} height={p.icon.size} viewBox={icon.viewBox}>
      <Path d={icon.path} fill={selected ? t.text.onAccent : t.brand.primary} />
    </Svg>
  );
}
