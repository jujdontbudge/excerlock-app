import { StyleSheet, View } from 'react-native';
import { Label } from '../../design-system';
import { Icon } from '../../icons/Icon';
import { tokens as t } from '../../design-system/tokens';

export type ActivityStat = { label: string; value: string; glyph?: 'flame'; a11y?: string };

/** Every stat stays on screen: the row divides the content width instead of scrolling one off the edge. */
export function ActivityStats({ stats }: { stats: ActivityStat[] }) {
  return (
    <View style={s.row}>
      {stats.map((stat) => (
        <View key={stat.label} style={s.stat} accessible accessibilityLabel={stat.a11y ?? `${stat.label}: ${stat.value}`}>
          <View style={s.valueRow}>
            {stat.glyph ? <Icon name={stat.glyph} size={t.icon.sm} variant="utility" /> : null}
            <Label variant="metricSmall" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{stat.value}</Label>
          </View>
          <Label variant="support" tone="secondary" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
            {stat.label}
          </Label>
        </View>
      ))}
    </View>
  );
}
const s = StyleSheet.create({
  row: { flexDirection: 'row', gap: t.space.sm },
  stat: { flex: 1, height: 58, alignItems: 'center', justifyContent: 'center', backgroundColor: t.surface.card,
    borderWidth: t.stroke.hairline, borderColor: t.border.outline, borderRadius: t.radius.field,
    paddingHorizontal: t.space.xs },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: -t.space.sm },
});
