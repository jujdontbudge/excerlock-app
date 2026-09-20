import { useCallback, useMemo, useState } from 'react';
import { LayoutChangeEvent, NativeSyntheticEvent, StyleSheet, View, ViewProps } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { Label } from '../../design-system';
import { tokens as t } from '../../design-system/tokens';
import { nearestEnabledTrendIndex, TrendPoint } from './trendModel';

const HEIGHT = 156;
const LEFT = 10;
const RIGHT = 310;
const TOP = 34;
const BOTTOM = 132;

type TouchEvent = NativeSyntheticEvent<{ locationX: number }>;

export function ActivityTrend({ label, points, selectedOffset, onSelect }: {
  label: string;
  points: readonly TrendPoint[];
  selectedOffset: number;
  onSelect: (offset: number) => void;
}) {
  const [width, setWidth] = useState(1);
  const selectedIndex = Math.max(0, points.findIndex((point) => point.offset === selectedOffset));
  const geometry = useMemo(() => graphGeometry(points), [points]);
  const selectAt = useCallback((event: TouchEvent) => {
    const index = nearestEnabledTrendIndex(points, event.nativeEvent.locationX, width);
    const point = points[index];
    if (point && point.offset !== selectedOffset) onSelect(point.offset);
  }, [onSelect, points, selectedOffset, width]);
  const changeSelection = useCallback((direction: -1 | 1) => {
    for (let index = selectedIndex + direction; index >= 0 && index < points.length; index += direction) {
      if (!points[index]?.disabled) {
        onSelect(points[index].offset);
        return;
      }
    }
  }, [onSelect, points, selectedIndex]);
  const selected = geometry.coordinates[selectedIndex] ?? geometry.coordinates[0];
  const selectedLabel = points[selectedIndex]?.label ?? '';
  const bubbleX = selected ? Math.max(LEFT, Math.min(RIGHT - 42, selected.x - 21)) : LEFT;
  const responder: ViewProps = {
    onStartShouldSetResponder: () => true,
    onMoveShouldSetResponder: () => true,
    onResponderGrant: selectAt,
    onResponderMove: selectAt,
  };
  return (
    <View style={s.card}>
      <View style={s.heading}>
        <Label variant="label">{label}</Label>
        <Label variant="support" tone="secondary">Drag to explore</Label>
      </View>
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
        <Svg width="100%" height={HEIGHT} viewBox={`0 0 320 ${HEIGHT}`} pointerEvents="none">
          <Defs>
            <LinearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={t.brand.decorative} stopOpacity="0.28" />
              <Stop offset="1" stopColor={t.brand.decorative} stopOpacity="0.01" />
            </LinearGradient>
          </Defs>
          {[0, 1, 2].map((row) => {
            const y = TOP + (BOTTOM - TOP) * row / 2;
            return <Line key={row} x1={LEFT} x2={RIGHT} y1={y} y2={y} stroke={t.chart.grid} strokeWidth="1" strokeDasharray="3 5" />;
          })}
          {geometry.area ? <Path d={geometry.area} fill="url(#trend-fill)" /> : null}
          {geometry.line ? <Path d={geometry.line} fill="none" stroke={t.chart.exercise} strokeWidth={t.stroke.chart} strokeLinecap="round" strokeLinejoin="round" /> : null}
          {geometry.coordinates.map((point, index) => (
            <Circle
              key={index}
              cx={point.x}
              cy={point.y}
              r={points[index]?.disabled ? 3 : 4}
              fill={points[index]?.disabled ? t.state.disabledFill : t.surface.solid}
              stroke={points[index]?.disabled ? t.state.disabledText : t.chart.exercise}
              strokeWidth="1.5"
            />
          ))}
          {selected ? (
            <>
              <Line x1={selected.x} x2={selected.x} y1={26} y2={BOTTOM} stroke={t.text.muted} strokeWidth="1" strokeDasharray="3 3" />
              <Circle cx={selected.x} cy={selected.y} r="8" fill={t.surface.solid} stroke={t.chart.exercise} strokeWidth="2.5" />
              <Circle cx={selected.x} cy={selected.y} r="3" fill={t.chart.exercise} />
              <Rect x={bubbleX} y="4" width="42" height="22" rx="11" fill={t.text.primary} />
              <SvgText x={bubbleX + 21} y="19" textAnchor="middle" fill={t.text.onAccent} fontFamily={t.font.semibold} fontSize="10">{selectedLabel}</SvgText>
            </>
          ) : null}
        </Svg>
      </View>
    </View>
  );
}

function graphGeometry(points: readonly TrendPoint[]) {
  const max = Math.max(1, ...points.map((point) => point.value));
  const coordinates = points.map((point, index) => ({
    x: points.length <= 1 ? (LEFT + RIGHT) / 2 : LEFT + (RIGHT - LEFT) * index / (points.length - 1),
    y: BOTTOM - (BOTTOM - TOP) * point.value / max,
  }));
  if (!coordinates.length) return { coordinates, line: '', area: '' };
  const line = smoothPath(coordinates);
  const area = `${line} L ${coordinates.at(-1)!.x} ${BOTTOM} L ${coordinates[0].x} ${BOTTOM} Z`;
  return { coordinates, line, area };
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
    borderRadius: t.radius.card, paddingHorizontal: t.space.lg, paddingTop: t.space.md, overflow: 'hidden' },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  graph: { height: HEIGHT, marginTop: t.space.xs },
});
