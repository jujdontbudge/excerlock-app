import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';

import { PillowCard } from './PillowCard';
import { PressableScale } from './PressableScale';
import { colors, radius, space, type } from './tokens';

export interface ChartDatum {
  color?: string;
  label: string;
  value: number;
  valueLabel?: string;
}

export interface ChartBarProps extends ChartDatum {
  height: number;
  maxValue: number;
  width?: number;
}

export function ChartBar({ color = colors.data.amber, height, label, maxValue, value, valueLabel, width = 18 }: ChartBarProps) {
  const normalizedHeight = maxValue <= 0 ? 0 : Math.max(8, (value / maxValue) * height);
  return (
    <View accessible accessibilityLabel={`${label}, ${valueLabel ?? value}`} style={styles.barSlot}>
      <View style={[styles.bar, { backgroundColor: color, height: normalizedHeight, width }]} />
      <Text numberOfLines={1} style={styles.axisLabel}>{label}</Text>
    </View>
  );
}

export interface BarChartProps {
  accessibilityLabel: string;
  data: readonly ChartDatum[];
  height?: number;
  style?: StyleProp<ViewStyle>;
}

export function BarChart({ accessibilityLabel, data, height = 132, style }: BarChartProps) {
  const maxValue = Math.max(0, ...data.map((datum) => datum.value));
  return (
    <View accessibilityLabel={accessibilityLabel} style={[styles.chart, { minHeight: height + 24 }, style]}>
      {data.map((datum, index) => (
        <ChartBar {...datum} height={height} key={`${datum.label}-${index}`} maxValue={maxValue} />
      ))}
    </View>
  );
}

export interface StackedBarSegment {
  color: string;
  label: string;
  value: number;
  valueLabel?: string;
}

export interface StackedBarProps {
  accessibilityLabel: string;
  segments: readonly StackedBarSegment[];
  showLegend?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function StackedBar({ accessibilityLabel, segments, showLegend = true, style }: StackedBarProps) {
  const total = segments.reduce((sum, segment) => sum + Math.max(0, segment.value), 0);
  return (
    <View style={style}>
      <View accessible accessibilityLabel={accessibilityLabel} style={styles.stackedTrack}>
        {segments.map((segment) => (
          <View
            key={segment.label}
            style={{ backgroundColor: segment.color, flex: total === 0 ? 1 : Math.max(0, segment.value) }}
          />
        ))}
      </View>
      {showLegend ? (
        <View style={styles.legend}>
          {segments.map((segment) => (
            <View accessible accessibilityLabel={`${segment.label}, ${segment.valueLabel ?? segment.value}`} key={segment.label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: segment.color }]} />
              <Text style={styles.legendLabel}>{segment.label}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export interface TrendChartProps extends BarChartProps {
  selectedLabel?: string;
}

/** Compact trend plot; exact values remain exposed on each accessible point. */
export function TrendChart({ accessibilityLabel, data, height = 132, selectedLabel, style }: TrendChartProps) {
  const maxValue = Math.max(0, ...data.map((datum) => datum.value));
  return (
    <View accessibilityLabel={accessibilityLabel} style={[styles.chart, { minHeight: height + 24 }, style]}>
      {data.map((datum, index) => {
        const selected = datum.label === selectedLabel;
        const normalizedHeight = maxValue <= 0 ? 0 : Math.max(8, (datum.value / maxValue) * height);
        return (
          <View accessible accessibilityLabel={`${datum.label}, ${datum.valueLabel ?? datum.value}`} key={`${datum.label}-${index}`} style={styles.barSlot}>
            <View style={[styles.trendStem, { backgroundColor: datum.color ?? colors.data.green, height: normalizedHeight }]}>
              <View style={[styles.trendPoint, selected && styles.trendPointSelected]} />
            </View>
            <Text style={[styles.axisLabel, selected && styles.axisSelected]}>{datum.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

export type HeatMapCellState = 'event' | 'rate' | 'state' | 'missed' | 'rest' | 'blank';

export interface HeatMapDatum {
  id: string;
  label: string;
  state: HeatMapCellState;
}

export interface HeatMapCellProps extends HeatMapDatum {
  onPress?: (id: string) => void;
}

const heatFill: Record<HeatMapCellState, string> = {
  event: colors.heatmap.met,
  rate: colors.heatmap.met,
  state: colors.heatmap.met,
  missed: colors.heatmap.missed,
  rest: colors.heatmap.rest,
  blank: colors.heatmap.blank,
};

const heatGlyph: Record<HeatMapCellState, string> = { event: '✓', rate: '▥', state: '●', missed: '', rest: '–', blank: '' };

export function HeatMapCell({ id, label, onPress, state }: HeatMapCellProps) {
  const cell = (
    <View style={[styles.heatCell, { backgroundColor: heatFill[state] }]}>
      <Text style={styles.heatGlyph}>{heatGlyph[state]}</Text>
    </View>
  );
  if (!onPress) {
    return <View accessible accessibilityLabel={label} style={styles.heatTarget}>{cell}</View>;
  }
  return (
    <PressableScale accessibilityLabel={label} accessibilityRole="button" onPress={() => onPress(id)} pressedScale={0.96}>
      <View style={styles.heatTarget}>{cell}</View>
    </PressableScale>
  );
}

export interface HeatMapProps {
  cells: readonly HeatMapDatum[];
  columns?: number;
  onCellPress?: (id: string) => void;
  style?: StyleProp<ViewStyle>;
}

export function HeatMap({ cells, columns = 7, onCellPress, style }: HeatMapProps) {
  return (
    <View style={[styles.heatMap, style]}>
      {cells.map((cell) => (
        <View key={cell.id} style={{ width: `${100 / columns}%` }}>
          <HeatMapCell {...cell} onPress={onCellPress} />
        </View>
      ))}
    </View>
  );
}

export interface BreakdownCardProps {
  context?: string;
  style?: StyleProp<ViewStyle>;
  title: string;
  value: string;
}

export function BreakdownCard({ context, style, title, value }: BreakdownCardProps) {
  return (
    <PillowCard style={style} variant="subtle">
      <Text style={styles.breakdownTitle}>{title}</Text>
      <Text adjustsFontSizeToFit numberOfLines={1} style={styles.breakdownValue}>{value}</Text>
      {context ? <Text style={styles.breakdownContext}>{context}</Text> : null}
    </PillowCard>
  );
}

const styles = StyleSheet.create({
  axisLabel: { ...type.caption, color: colors.text.tertiary, marginTop: space[2], maxWidth: 46, textAlign: 'center' },
  axisSelected: { color: colors.text.primary, fontWeight: '700' },
  bar: { borderRadius: radius.pill, minHeight: 8 },
  barSlot: { alignItems: 'center', flex: 1, justifyContent: 'flex-end', minWidth: 28 },
  breakdownContext: { ...type.caption, color: colors.text.secondary, marginTop: space[2] },
  breakdownTitle: { ...type.label, color: colors.text.secondary },
  breakdownValue: { ...type.heroMd, color: colors.text.primary, marginTop: space[1] },
  chart: { alignItems: 'flex-end', flexDirection: 'row', gap: space[2], width: '100%' },
  heatCell: { alignItems: 'center', borderRadius: radius.xs, height: 30, justifyContent: 'center', width: 30 },
  heatGlyph: { ...type.caption, color: colors.text.primary, fontWeight: '700' },
  heatMap: { flexDirection: 'row', flexWrap: 'wrap' },
  heatTarget: { alignItems: 'center', height: 44, justifyContent: 'center', width: '100%' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: space[3], marginTop: space[3] },
  legendDot: { borderRadius: 4, height: 8, width: 8 },
  legendItem: { alignItems: 'center', flexDirection: 'row', gap: space[1] },
  legendLabel: { ...type.caption, color: colors.text.secondary },
  stackedTrack: { borderRadius: radius.pill, flexDirection: 'row', height: 14, overflow: 'hidden', width: '100%' },
  trendPoint: { alignSelf: 'center', backgroundColor: colors.surface.light, borderRadius: 5, height: 10, marginTop: -5, width: 10 },
  trendPointSelected: { backgroundColor: colors.brand.signatureAmber, height: 14, width: 14 },
  trendStem: { borderRadius: radius.pill, minHeight: 8, width: 8 },
});
