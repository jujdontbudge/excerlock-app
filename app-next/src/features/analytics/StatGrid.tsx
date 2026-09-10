import { View, StyleSheet } from 'react-native';
import { Label } from '../../design-system';
import { Icon, IconName } from '../../icons/Icon';
import { tokens as t } from '../../design-system/tokens';
export type Stat = { key: string; label: string; value: string; support?: string; icon: IconName };
/** Two-column outlined tiles: value, label, orange glyph. */
export function StatGrid({ stats }: { stats: Stat[] }) {
  return (
    <View style={s.grid}>
      {stats.map((stat) => (
        <View
          key={stat.key}
          accessible
          accessibilityLabel={[stat.label, stat.value, stat.support].filter(Boolean).join(', ')}
          style={s.tile}>
          <View style={s.row}>
            <Label variant="metricSmall" style={{ flexShrink: 1 }} numberOfLines={1} adjustsFontSizeToFit>
              {stat.value}
            </Label>
            <View style={s.glyph}>
              <Icon name={stat.icon} variant="utility" size={22} tint={t.text.onAccent} />
            </View>
          </View>
          <Label variant="label">{stat.label}</Label>
          {stat.support ? (
            <Label variant="support" tone="secondary">
              {stat.support}
            </Label>
          ) : null}
        </View>
      ))}
    </View>
  );
}
const s = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space.md },
  tile: {
    flexBasis: '47%',
    flexGrow: 1,
    borderRadius: t.radius.card,
    borderWidth: t.stroke.hairline,
    borderColor: t.border.outline,
    backgroundColor: t.surface.glass,
    padding: t.space.lg,
    gap: t.space.xs,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: t.space.sm },
  glyph: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: t.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
