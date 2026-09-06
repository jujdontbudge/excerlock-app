import { compactNumber } from '../content/format';
import { View } from 'react-native';
import { ChartBar } from './ChartBar';
import { Label } from './Label';
import { tokens as t } from './tokens';
import { chartCopy } from '../content/charts';
import { Reveal } from '../motion/Reveal';
export type ChartDatum = {
  label: string;
  value: number | null;
  comparison?: number;
};
export function BarChart({ data, label }: { data: readonly ChartDatum[]; label: string }) {
  const max = Math.max(1, ...data.flatMap((d) => [d.value ?? 0, d.comparison ?? 0]));
  return (
    <Reveal>
      <Label variant="support" tone="secondary">
        {label}
      </Label>
      <View style={{ flexDirection: 'row', gap: t.space.xs, marginTop: t.space.lg }}>
        {data.map((d, i) => (
          <View
            key={`${d.label}-${i}`}
            accessible
            accessibilityLabel={`${d.label}: ${d.value === null ? chartCopy.noMeasurement : d.value}`}
            style={{ flex: 1, gap: t.space.sm, alignItems: 'center' }}>
            <View
              style={{
                height: t.layout.chartHeight,
                width: '100%',
                borderBottomWidth: t.stroke.hairline,
                borderColor: t.chart.grid,
              }}>
              <ChartBar value={d.value ?? 0} comparison={d.comparison} max={max} index={i} />
            </View>
            <Label variant="badge" tone="secondary">
              {d.label}
            </Label>
            <Label variant="badge">{d.value === null ? chartCopy.dash : compactNumber(d.value)}</Label>
          </View>
        ))}
      </View>
    </Reveal>
  );
}
