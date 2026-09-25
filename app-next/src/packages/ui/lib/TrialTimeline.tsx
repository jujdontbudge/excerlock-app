import { View } from 'react-native';
import { Label } from '../Label';
import { tokens as t } from '../tokens';
import { Icon } from '../Icon';
import { Reveal } from '../Reveal';
export function TrialTimeline({ milestones }: { milestones: readonly { title: string; body: string }[] }) {
  return (
    <View>
      {milestones.map((milestone, i) => (
        <Reveal key={milestone.title} index={i}>
          <View style={{ flexDirection: 'row', gap: t.space.lg }}>
            <View style={{ alignItems: 'center' }}>
              <Icon name={i === 0 ? 'lock-open' : i === 1 ? 'bell' : 'star'} size={t.icon.lg} />
              {i < milestones.length - 1 ? (
                <View
                  style={{
                    flex: 1,
                    width: t.stroke.selected,
                    backgroundColor: t.brand.light,
                    minHeight: t.space.xxl,
                  }}
                />
              ) : null}
            </View>
            <View style={{ flex: 1, gap: t.space.xs, paddingBottom: t.space.xl }}>
              <Label variant="label" style={{ color: i === 0 ? t.text.primary : t.text.primary }}>
                {milestone.title}
              </Label>
              <Label tone="secondary">{milestone.body}</Label>
            </View>
          </View>
        </Reveal>
      ))}
    </View>
  );
}
