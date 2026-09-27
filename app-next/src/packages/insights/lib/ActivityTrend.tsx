import { useCallback, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, NativeSyntheticEvent, StyleSheet, View, ViewProps } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Line, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { Label } from '../../ui';
import { tokens as t } from '../../ui/tokens';
import { nearestEnabledTrendIndex, TrendPoint } from './trendModel';
import { haptic } from '../../ui/haptics';

const HEIGHT = 156;
const INSET = 14;
const TOP = 32;
const BOTTOM = 146;
const BUBBLE = 46;
const SCRUB_TICK_GAP = 120;

type TouchEvent = NativeSyntheticEvent<{ locationX: number }>;

export function ActivityTrend({ label, points, selectedOffset, onSelect }: {
  label: string;
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
  const right = plotWidth - INSET;
  const bubbleX = selected
    ? Math.max(INSET, Math.min(right - BUBBLE, selected.x - BUBBLE / 2))
    : INSET;
  const responder: ViewProps = {
    onStartShouldSetResponder: () => true,
    onMoveShouldSetResponder: () => true,
    onResponderGrant: selectAt,
    onResponderMove: selectAt,
  };
  return (
    <View style={s.card}>
      <Label variant="label">{label}</Label>
      <View
        testID="Analytics trend scrubber"
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{ text: selectedLabel }}
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
            <Line key={`grid-${index}`} x1={point.x} x2={point.x} y1={TOP - 6} y2={BOTTOM} stroke={t.chart.grid} strokeWidth="1" />
          ))}
          <Line
            x1={INSET}
            x2={right}
            y1={geometry.averageY}
            y2={geometry.averageY}
            stroke={t.border.mutedStroke}
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="0.1 6"
          />
          {geometry.area ? <Path d={geometry.area} fill="url(#trend-area)" /> : null}
          {geometry.line ? <Path d={geometry.line} fill="none" stroke={t.chart.exercise} strokeWidth={t.stroke.chart} strokeLinecap="round" strokeLinejoin="round" /> : null}
          {geometry.coordinates.map((point, index) => (
            <Circle
              key={index}
              cx={point.x}
              cy={point.y}
              r={points[index]?.disabled ? 3 : 4}
              fill={points[index]?.disabled ? t.state.disabledFill : t.surface.card}
              stroke={points[index]?.disabled ? t.state.disabledText : t.chart.exercise}
              strokeWidth="1.5"
            />
          ))}
          {selected ? (
            <>
              <Line x1={selected.x} x2={selected.x} y1={28} y2={BOTTOM} stroke={t.border.mutedStroke} strokeWidth="1" strokeDasharray="3 3" />
              <Circle cx={selected.x} cy={selected.y} r="8" fill={t.surface.card} stroke={t.chart.exercise} strokeWidth="2.5" />
              <Circle cx={selected.x} cy={selected.y} r="3" fill={t.chart.exercise} />
              <Rect x={bubbleX} y="2" width={BUBBLE} height="24" rx="12" fill={t.text.primary} />
              <SvgText x={bubbleX + BUBBLE / 2} y="18" textAnchor="middle" fill={t.text.onAccent} fontFamily={t.type.micro.fontFamily} fontSize={t.type.micro.fontSize}>{selectedLabel}</SvgText>
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
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const previous = points[index - 1] ?? points[index];
    const current = points[index];
    const next = points[index + 1];
    const after = points[index + 2] ?? next;
    path += ` C ${current.x + (next.x - previous.x) / 6} ${current.y + (next.y - previous.y) / 6}, ${next.x - (after.x - current.x) / 6} ${next.y - (after.y - current.y) / 6}, ${next.x} ${next.y}`;
  }
  return path;
}

const s = StyleSheet.create({
  card: { backgroundColor: t.surface.card, borderWidth: t.stroke.hairline, borderColor: t.border.outline,
    borderRadius: t.radius.card, paddingHorizontal: t.space.lg, paddingTop: t.space.md,
    paddingBottom: t.space.sm, gap: t.space.xs, overflow: 'hidden' },
  graph: { height: HEIGHT },
});
