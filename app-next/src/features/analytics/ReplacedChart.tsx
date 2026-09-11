import { View, StyleSheet } from 'react-native';
import { Label } from '../../design-system';
import { tokens as t } from '../../design-system/tokens';
import { analyticsCopy as c } from '../../content/analytics';
export type ReplacedPoint = { label: string; reclaimed: number | null; today?: boolean };
/** Orange columns of screen time replaced per bucket; a dashed grey line marks the average. */
export function ReplacedChart({ data }: { data: ReplacedPoint[] }) {
  const measured = data.flatMap((d) => (d.reclaimed === null ? [] : [d.reclaimed])),
    average = measured.length ? measured.reduce((a, b) => a + b, 0) / measured.length : null,
    max = Math.max(60, Math.ceil(Math.max(0, ...measured) / 30) * 30),
    every = data.length > 8 ? Math.ceil(data.length / 6) : 1;
  return (
    <View accessibilityLabel={c.chart} style={s.card}>
      <View style={s.plot}>
        {[1, 0.5, 0].map((n) => (
          <View key={n} style={[s.grid, { top: `${(1 - n) * 100}%` }]}>
            <Label variant="badge" tone="secondary" style={s.axis}>
              {Math.round(max * n)}m
            </Label>
          </View>
        ))}
        {average !== null ? <View style={[s.average, { top: `${(1 - average / max) * 100}%` }]} /> : null}
        <View style={s.columns}>
          {data.map((d, i) => (
            <View
              key={i}
              style={s.column}
              accessible
              accessibilityLabel={`${d.label}: ${d.reclaimed === null ? c.noMeasurement : `${Math.round(d.reclaimed)} minutes replaced`}`}>
              <View style={s.track}>
                {d.reclaimed === null ? (
                  <View style={s.gap} />
                ) : (
                  <View
                    style={[
                      s.bar,
                      {
                        height: `${Math.max(2, (d.reclaimed / max) * 100)}%`,
                        backgroundColor: d.today === false ? t.brand.light : t.brand.primary,
                      },
                    ]}
                  />
                )}
              </View>
              <Label
                variant="badge"
                tone={d.today ? 'primary' : 'secondary'}
                style={[s.day, i % every !== 0 && i !== data.length - 1 ? { opacity: 0 } : null]}>
                {d.label}
              </Label>
            </View>
          ))}
        </View>
      </View>
      {average !== null ? (
        <View style={s.legend}>
          <View style={s.dash} />
          <Label variant="support" tone="secondary">
            {c.chartAverage(average)}
          </Label>
        </View>
      ) : null}
    </View>
  );
}
const s = StyleSheet.create({
  card: {
    borderRadius: t.radius.card,
    borderWidth: t.stroke.hairline,
    borderColor: t.border.outline,
    backgroundColor: t.surface.glass,
    padding: t.space.lg,
    gap: t.space.md,
  },
  plot: { height: 150, marginRight: 40, marginBottom: 22 },
  grid: { position: 'absolute', width: '100%', borderTopWidth: 1, borderColor: t.chart.grid },
  axis: { position: 'absolute', left: '100%', marginLeft: t.space.sm, top: -7, width: 36 },
  average: {
    position: 'absolute',
    width: '100%',
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: t.text.muted,
  },
  columns: { flex: 1, flexDirection: 'row', gap: t.space.xs },
  column: { flex: 1, alignItems: 'center' },
  track: { flex: 1, width: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  bar: { width: '58%', maxWidth: 28, borderRadius: 6 },
  gap: { width: '58%', maxWidth: 28, height: 3, borderRadius: 2, backgroundColor: t.chart.grid },
  day: { position: 'absolute', top: '100%', marginTop: t.space.sm, textAlign: 'center' },
  legend: { flexDirection: 'row', alignItems: 'center', gap: t.space.sm },
  dash: { width: 16, borderTopWidth: 1, borderStyle: 'dashed', borderColor: t.text.muted },
});
