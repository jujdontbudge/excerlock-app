import { StyleSheet, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { Label } from '../../ui';
import { tokens as t } from '../../ui/tokens';

export type ActivityStat = { label: string; value: string; a11y?: string };

export function ActivityStats({ stats }: { stats: ActivityStat[] }) {
  return (
    <ScrollView testID="Analytics stats strip" horizontal directionalLockEnabled showsHorizontalScrollIndicator={false} style={s.strip} contentContainerStyle={s.row}>
      {stats.map((stat) => (
        <View key={stat.label} style={s.stat} accessible accessibilityLabel={stat.a11y ?? `${stat.label}: ${stat.value}`}>
          <Label variant="section" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={s.value}>
            {stat.value}
          </Label>
          <Label variant="support" tone="secondary" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={s.label}>
            {stat.label}
          </Label>
        </View>
      ))}
    </ScrollView>
  );
}
const s = StyleSheet.create({
  strip: { alignSelf: 'stretch', marginRight: -t.layout.page, flexGrow: 0 },
  row: { flexDirection: 'row', gap: t.space.sm, paddingRight: t.space.sm },
  stat: { width: t.control.row + t.space.sm, minHeight: t.control.full,
    alignItems: 'center', justifyContent: 'center', backgroundColor: t.surface.card,
    borderWidth: t.stroke.hairline, borderColor: t.border.outline, borderRadius: t.radius.field,
    paddingHorizontal: t.space.xs, paddingVertical: t.space.xs },
  value: { width: '100%', textAlign: 'center' },
  label: { width: '100%', textAlign: 'center' },
});
