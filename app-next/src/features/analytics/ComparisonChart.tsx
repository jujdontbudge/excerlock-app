import { View, StyleSheet } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { Label } from '../../design-system';
import { tokens as t } from '../../design-system/tokens';
import { analyticsCopy as c } from '../../content/analytics';
/** Both series are minutes. Missing measurements remain gaps. */
export function ComparisonChart({
  data,
  estimate,
}: {
  data: { label: string; value: number | null; reclaimed: number | null }[];
  estimate?: number;
}) {
  const rows = data;
  const max = Math.max(
    60,
    Math.ceil(Math.max(estimate ?? 0, ...rows.flatMap((d) => [d.value ?? 0, d.reclaimed ?? 0])) / 60) * 60,
  );
  return (
    <View accessibilityLabel={c.chartLabel} style={{ gap: 16 }}>
      <View style={s.legend}>
        {[
          [c.screenTime, t.brand.light],
          [c.timeReclaimed, t.brand.primary],
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
        {estimate !== undefined ? (
          <Svg pointerEvents="none" width="100%" height="100%" viewBox="0 0 100 100" style={s.estimate}>
            <Line
              x1={0}
              x2={100}
              y1={100 - (estimate / max) * 100}
              y2={100 - (estimate / max) * 100}
              stroke={t.text.secondary}
              strokeDasharray="4 4"
              strokeWidth={t.stroke.hairline}
            />
          </Svg>
        ) : null}
        <View style={s.columns}>
          {rows.map((d, i) => (
            <View key={i} style={s.column} accessible accessibilityLabel={c.chartPoint(d.label, d.value, d.reclaimed)}>
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
      {estimate !== undefined ? (
        <Label variant="support" tone="secondary">
          {c.estimate(estimate)}
        </Label>
      ) : null}
    </View>
  );
}
const s = StyleSheet.create({
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 24 },
  key: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  swatch: { width: 10, height: 10, borderRadius: 3 },
  grid: { position: 'absolute', width: '100%', borderTopWidth: 1, borderColor: t.chart.grid },
  estimate: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  axis: { position: 'absolute', left: '100%', marginLeft: 8, top: -7, width: 36 },
  columns: { flex: 1, flexDirection: 'row' },
  column: { flex: 1, alignItems: 'center' },
  pair: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 3, width: '100%' },
  bar: { width: '28%', maxWidth: 16, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  day: { position: 'absolute', top: '100%', marginTop: 8, textAlign: 'center', fontSize: 10 },
});
