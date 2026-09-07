import { View, StyleSheet } from 'react-native';
import { Label } from '../../design-system';
import { tokens as t } from '../../design-system/tokens';
/** Both series are minutes. Missing measurements remain gaps. */
export function ComparisonChart({
  data,
}: {
  data: { label: string; value: number | null; reclaimed: number | null }[];
}) {
  const rows = data;
  const max = Math.max(60, Math.ceil(Math.max(...rows.flatMap((d) => [d.value ?? 0, d.reclaimed ?? 0])) / 60) * 60);
  return (
    <View accessibilityLabel="Screen time and time reclaimed chart" style={{ gap: 16 }}>
      <View style={s.legend}>
        {[
          ['Screen time', t.brand.light],
          ['Time reclaimed', t.brand.primary],
        ].map(([label, color]) => (
          <View key={label} style={s.key}>
            <View style={[s.swatch, { backgroundColor: color }]} />
            <Label variant="support">{label}</Label>
          </View>
        ))}
      </View>
      <View style={{ height: 148, marginBottom: 24, marginRight: 32 }}>
        {[1, 0.75, 0.5, 0.25, 0].map((n) => (
          <View key={n} style={[s.grid, { top: `${(1 - n) * 100}%` }]}>
            <Label variant="badge" tone="secondary" style={s.axis}>
              {Math.round(max * n)}m
            </Label>
          </View>
        ))}
        <View style={s.columns}>
          {rows.map((d, i) => (
            <View
              key={i}
              style={s.column}
              accessible
              accessibilityLabel={`${d.label}: ${d.value === null ? 'No measurement' : `${Math.round(d.value)} screen-time minutes, ${Math.round(d.reclaimed!)} reclaimed minutes`}`}>
              <View style={s.pair}>
                <View style={[s.bar, { height: `${((d.value ?? 0) / max) * 100}%`, backgroundColor: t.brand.light }]} />
                <View
                  style={[s.bar, { height: `${((d.reclaimed ?? 0) / max) * 100}%`, backgroundColor: t.brand.primary }]}
                />
              </View>
              <Label variant="badge" tone="secondary" style={s.day}>
                {d.label}
                {d.value === null ? '\n—' : ''}
              </Label>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 24 },
  key: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  swatch: { width: 10, height: 10, borderRadius: 3 },
  grid: { position: 'absolute', width: '100%', borderTopWidth: 1, borderColor: t.chart.grid },
  axis: { position: 'absolute', left: '100%', marginLeft: 8, top: -7, width: 36 },
  columns: { flex: 1, flexDirection: 'row' },
  column: { flex: 1, alignItems: 'center' },
  pair: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 3, width: '100%' },
  bar: { width: '28%', maxWidth: 16, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  day: { position: 'absolute', top: '100%', marginTop: 8, textAlign: 'center', fontSize: 10 },
});
