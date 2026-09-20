import { ScrollView, StyleSheet, View } from 'react-native';
import { Label } from '../../design-system';
import { tokens as t } from '../../design-system/tokens';

export type ActivityStat = { label: string; value: string };
export function ActivityStats({ stats }: { stats: ActivityStat[] }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.scroll} contentContainerStyle={s.content}>
      {stats.map((stat) => (
        <View key={stat.label} style={s.stat} accessible accessibilityLabel={`${stat.label}: ${stat.value}`}>
          <Label variant="label" numberOfLines={1}>{stat.value}</Label>
          <Label variant="badge" tone="secondary" numberOfLines={1}>{stat.label}</Label>
        </View>
      ))}
    </ScrollView>
  );
}
const s = StyleSheet.create({
  scroll: { marginHorizontal: -t.space.lg },
  content: { gap: t.space.sm, paddingHorizontal: t.space.lg },
  stat: { minWidth: 92, alignItems: 'center', backgroundColor: t.surface.card,
    borderWidth: t.stroke.hairline, borderColor: t.border.outline, borderRadius: t.radius.card,
    paddingHorizontal: t.space.md, paddingVertical: t.space.sm, gap: t.space.xs },
});
