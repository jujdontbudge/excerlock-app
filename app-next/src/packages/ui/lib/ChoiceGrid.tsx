import { View } from 'react-native';
import { activities, ActivityId } from '../activitiesCopy';
import { ActivityCard, ChoiceEmphasis } from './ActivityCard';
import { tokens as t } from '../tokens';
import { Reveal } from '../Reveal';
export function ChoiceGrid({
  selected,
  onChange,
  emphasis,
}: {
  selected?: ActivityId;
  onChange: (activity: ActivityId) => void;
  emphasis?: ChoiceEmphasis;
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.space.md }}>
      {activities.map((a, i) => (
        <Reveal key={a.id} index={i} style={{ flexBasis: '46%', flexGrow: 1 }}>
          <ActivityCard
            activity={a.id}
            title={a.title}
            selected={selected === a.id}
            emphasis={emphasis}
            onPress={() => onChange(a.id)}
          />
        </Reveal>
      ))}
    </View>
  );
}
