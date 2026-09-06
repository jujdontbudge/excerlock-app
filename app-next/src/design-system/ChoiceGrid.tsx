import { View } from 'react-native';
import { activities, ActivityId } from '../content/activities';
import { ActivityCard } from './ActivityCard';
import { tokens as t } from './tokens';
import { Reveal } from '../motion/Reveal';
export function ChoiceGrid({
  selected,
  onChange,
}: {
  selected?: ActivityId;
  onChange: (activity: ActivityId) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.space.md }}>
      {activities.map((a, i) => (
        <Reveal key={a.id} index={i} style={{ flexBasis: '46%', flexGrow: 1 }}>
          <ActivityCard activity={a.id} title={a.title} selected={selected === a.id} onPress={() => onChange(a.id)} />
        </Reveal>
      ))}
    </View>
  );
}
