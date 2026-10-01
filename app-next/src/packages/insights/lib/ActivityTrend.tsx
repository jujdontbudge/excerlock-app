import { useCallback, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, NativeSyntheticEvent, StyleSheet, View, ViewProps } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Line, Path, Stop } from 'react-native-svg';
import { Label } from '../../ui';
import { tokens as t } from '../../ui/tokens';
import { analyticsCopy as c } from './analyticsCopy';
import { Period } from './period';
import { nearestEnabledTrendIndex, TrendPoint } from './trendModel';
import { haptic } from '../../ui/haptics';

const HEIGHT = t.layout.trendHeight;
const INSET = t.space.md;
const TOP = t.space.md;
const BOTTOM = HEIGHT - t.space.md;
const SCRUB_TICK_GAP = 120;

type TouchEvent = NativeSyntheticEvent<{ locationX: number }>;

export function ActivityTrend({ label, period, points, selectedOffset, onSelect }: {
  label: string;
  period: Period;
  points: readonly TrendPoint[];
  selectedOffset: number;
  onSelect: (offset: number) => void;
}) {
  const [width, setWidth] = useState(0);
  const lastTick = useRef(0);
  const plotWidth = Math.max(120, width);
  const selectedIndex = Math.max(0, points.findIndex((point) => point.offset === selectedOffset));
  const geometry = useMemo(() => graphGeometry(points, plotWidth), [points, plotWidth]);
  const selectAt = useCallback((event: TouchEvent) => {
    const index = nearestEnabledTrendIndex(points, event.nativeEvent.locationX, width);
    const point = points[index];
    if (!point || point.offset === selectedOffset) return;
    const now = Date.now();
    if (now - lastTick.current >= SCRUB_TICK_GAP) {
      lastTick.current = now;
      haptic('detent');
    }
    onSelect(point.offset);
  }, [onSelect, points, selectedOffset, width]);
  const changeSelection = useCallback((direction: -1 | 1) => {
    for (let index = selectedIndex + direction; index >= 0 && index < points.length; index += direction) {
      if (!points[index]?.disabled) {
        haptic('select');
        onSelect(points[index].offset);
        return;
      }
    }
  }, [onSelect, points, selectedIndex]);
  const selected = geometry.coordinates[selectedIndex] ?? geometry.coordinates[0];
  const selectedLabel = points[selectedIndex]?.label ?? '';
  const responder: ViewProps = {
    onStartShouldSetResponder: () => true,
    onMoveShouldSetResponder: () => true,
    onResponderGrant: selectAt,
    onResponderMove: selectAt,
  };
  return (
    <View style={s.card}>
      <View style={s.context}>
        {period === 'Day' ? points.map((point, index) => (
          <View key={point.offset} style={s.daySlot}>
            <View style={index === selectedIndex ? s.selectedDay : undefined}>
              <Label variant="micro" tone={index === selectedIndex ? 'onAccent' : 'secondary'}>
                {point.label}
              </Label>
            </View>
          </View>
        )) : <Label variant="micro" tone="secondary">{selectedLabel}</Label>}
      </View>
      <View
        testID="Analytics trend scrubber"
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityHint={period === 'Month' ? c.monthTrendHint : undefined}
        accessibilityValue={{ text: `${selectedLabel}, ${points[selectedIndex]?.value.toLocaleString('en-US') ?? '0'}` }}
        accessibilityActions={[{ name: 'decrement' }, { name: 'increment' }]}
        onAccessibilityAction={(event) => changeSelection(event.nativeEvent.actionName === 'increment' ? 1 : -1)}
        onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
        style={s.graph}
        {...responder}>
        <Svg width="100%" height={HEIGHT} viewBox={`0 0 ${plotWidth} ${HEIGHT}`} pointerEvents="none">
          <Defs>
            <LinearGradient id="trend-area" x1="0" y1={TOP} x2="0" y2={BOTTOM} gradientUnits="userSpaceOnUse">
              <Stop offset="0" stopColor={t.brand.primary} stopOpacity="0.30" />
              <Stop offset="1" stopColor={t.brand.primary} stopOpacity="0.02" />
            </LinearGradient>
          </Defs>
          {geometry.coordinates.map((point, index) => (
            <Line key={`grid-${index}`} x1={point.x} x2={point.x} y1={TOP} y2={BOTTOM} stroke={t.chart.grid} strokeWidth={t.stroke.hairline} />
          ))}
          <Line
            x1={INSET}
            x2={plotWidth - INSET}
            y1={geometry.averageY}
            y2={geometry.averageY}
            stroke={t.border.mutedStroke}
            strokeWidth={t.stroke.hairline}
            strokeLinecap="round"
            strokeDasharray="1 5"
          />
          {geometry.area ? <Path d={geometry.area} fill="url(#trend-area)" /> : null}
          {geometry.line ? <Path d={geometry.line} fill="none" stroke={t.chart.exercise} strokeWidth={t.stroke.chart} strokeLinecap="round" strokeLinejoin="round" /> : null}
          {geometry.coordinates.map((point, index) => (
            <Circle
              key={index}
              cx={point.x}
              cy={point.y}
              r={t.space.xs}
              fill={points[index]?.disabled ? t.state.disabledFill : t.surface.card}
              stroke={points[index]?.disabled ? t.state.disabledText : t.chart.exercise}
              strokeWidth={t.stroke.selected}
            />
          ))}
          {selected ? (
            <>
              <Circle cx={selected.x} cy={selected.y} r={t.space.sm + t.space.xs / 2} fill={t.surface.card} stroke={t.chart.exercise} strokeWidth={t.stroke.chart} />
              <Circle cx={selected.x} cy={selected.y} r={t.space.xs / 2} fill={t.chart.exercise} />
            </>
          ) : null}
        </Svg>
      </View>
    </View>
  );
}

function graphGeometry(points: readonly TrendPoint[], plotWidth: number) {
  const left = INSET;
  const right = plotWidth - INSET;
  const max = Math.max(1, ...points.map((point) => point.value));
  const coordinates = points.map((point, index) => ({
    x: points.length <= 1 ? (left + right) / 2 : left + (right - left) * index / (points.length - 1),
    y: BOTTOM - (BOTTOM - TOP) * point.value / max,
  }));
  if (!coordinates.length) return { coordinates, line: '', area: '', averageY: BOTTOM };
  const line = smoothPath(coordinates);
  const area = `${line} L ${coordinates.at(-1)!.x} ${BOTTOM} L ${coordinates[0].x} ${BOTTOM} Z`;
  const average = points.reduce((total, point) => total + point.value, 0) / points.length;
  const averageY = BOTTOM - (BOTTOM - TOP) * average / max;
  return { coordinates, line, area, averageY };
}

function smoothPath(points: readonly { x: number; y: number }[]) {
  if (!points.length) return '';
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    const third = (next.x - current.x) / 3;
    path += ` C ${current.x + third} ${current.y}, ${next.x - third} ${next.y}, ${next.x} ${next.y}`;
  }
  return path;
}

const s = StyleSheet.create({
  card: { backgroundColor: t.surface.card, borderWidth: t.stroke.hairline, borderColor: t.border.outline,
    borderRadius: t.radius.card, paddingHorizontal: t.space.lg, paddingTop: t.space.sm,
    paddingBottom: t.space.sm, gap: t.space.xs, overflow: 'hidden' },
  context: { height: t.type.support.lineHeight + t.space.xs, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  daySlot: { flex: 1, alignItems: 'center' },
  selectedDay: { backgroundColor: t.brand.primary, borderRadius: t.radius.pill, paddingHorizontal: t.space.xs },
  graph: { height: HEIGHT },
});
