import { StyleSheet, View } from 'react-native';
import { Label } from '../../design-system';
import { Icon } from '../../icons/Icon';
import { tokens as t } from '../../design-system/tokens';

/** Period total with its range and the average-against-last-period pill, as on the reference dashboard. */
export function PeriodHeader({ range, total, average, rising, unit }: {
  range: string;
  total: string;
  average: string;
  rising: boolean;
  unit: string;
}) {
  return (
    <View style={s.header}>
      <View style={s.totals} accessible accessibilityLabel={`${range}: ${total} ${unit}`}>
        <Label variant="support" tone="secondary" numberOfLines={1}>{range}</Label>
        <Label variant="metricSmall" numberOfLines={1}>{total}</Label>
      </View>
      <View
        testID="Analytics average"
        style={s.average}
        accessible
        accessibilityLabel={`Average ${average} ${unit}, ${rising ? 'up from' : 'down from'} the previous period`}>
        <Label variant="label" numberOfLines={1}>AVG {average}</Label>
        <View style={s.disc}>
          <View style={{ transform: [{ rotate: rising ? '-45deg' : '45deg' }] }}>
            <Icon name="arrow" size={t.layout.glyph - 8} tint={t.text.onAccent} variant="utility" />
          </View>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: t.space.md },
  totals: { flex: 1 },
  average: { flexDirection: 'row', alignItems: 'center', gap: t.space.sm,
    borderWidth: t.stroke.hairline, borderColor: t.border.outline, borderRadius: t.radius.pill,
    backgroundColor: t.surface.card, paddingLeft: t.space.md, paddingRight: t.space.sm, height: 38 },
  disc: { width: 26, height: 26, borderRadius: t.radius.pill, backgroundColor: t.brand.primary,
    alignItems: 'center', justifyContent: 'center' },
});
