import { useEffect, useRef, useState } from 'react';
import { PanResponder, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, G, Line, Text as SvgText } from 'react-native-svg';
import { Label } from './Label';
import { PressableScale } from './PressableScale';
import { tokens as t } from './tokens';
import { controls } from '../content/controls';
import { minuteLabel } from '../domain/scheduleLabel';
import { feedback } from '../motion/haptics';
import { boundedMinute, dialMinute, dialPoint, nearestHandle, ScheduleHandle } from './scheduleDialMath';

const SIZE = 360;
const CENTER = SIZE / 2;
const RADIUS = 154;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Drag either endpoint around a 24-hour clock; tap the times for precise wheel entry. */
export function ScheduleDial({
  startMinute, endMinute, allDay, onChange, onChoose,
}: {
  startMinute: number;
  endMinute: number;
  allDay: boolean;
  onChange: (which: ScheduleHandle, minute: number) => void;
  onChoose: (which: ScheduleHandle) => void;
}) {
  const { width } = useWindowDimensions();
  const size = Math.min(width - t.layout.page * 2, 420);
  const [preview, setPreview] = useState({ start: startMinute, end: endMinute });
  const active = useRef<ScheduleHandle | null>(null);
  const origin = useRef({ x: 0, y: 0 });
  const live = useRef({ preview, size, onChange });
  live.current = { preview, size, onChange };
  useEffect(() => {
    if (!active.current) setPreview({ start: startMinute, end: endMinute });
  }, [startMinute, endMinute]);

  const responders = useRef(PanResponder.create({
    onStartShouldSetPanResponder: (event) => {
      const scale = SIZE / live.current.size;
      const x = event.nativeEvent.locationX * scale;
      const y = event.nativeEvent.locationY * scale;
      return Math.abs(Math.hypot(x - CENTER, y - CENTER) - RADIUS) <= 28;
    },
    onPanResponderGrant: (event) => {
      const e = event.nativeEvent;
      const scale = SIZE / live.current.size;
      origin.current = { x: e.pageX - e.locationX, y: e.pageY - e.locationY };
      const minute = dialMinute(e.locationX * scale, e.locationY * scale, CENTER);
      active.current = nearestHandle(minute, live.current.preview.start, live.current.preview.end);
      feedback();
    },
    onPanResponderMove: (event) => {
      const which = active.current;
      if (!which) return;
      const scale = SIZE / live.current.size;
      const minute = dialMinute((event.nativeEvent.pageX - origin.current.x) * scale,
        (event.nativeEvent.pageY - origin.current.y) * scale, CENTER);
      const p = live.current.preview;
      const value = boundedMinute(which, minute, p.start, p.end);
      if (p[which] === value) return;
      const next = { ...p, [which]: value };
      live.current.preview = next;
      setPreview(next);
    },
    onPanResponderRelease: () => {
      const which = active.current;
      active.current = null;
      if (which) { live.current.onChange(which, live.current.preview[which]); feedback(); }
    },
    onPanResponderTerminationRequest: () => false,
    onPanResponderTerminate: () => {
      const which = active.current;
      active.current = null;
      if (which) live.current.onChange(which, live.current.preview[which]);
    },
    onShouldBlockNativeResponder: () => true,
  })).current;

  const start = minuteLabel(preview.start);
  const end = minuteLabel(preview.end);
  const duration = allDay && !active.current ? 1440 : (preview.end - preview.start + 1440) % 1440;
  const points = { start: dialPoint(preview.start, CENTER, RADIUS), end: dialPoint(preview.end, CENTER, RADIUS) };
  const durationText = `${Math.floor(duration / 60)} hr${duration % 60 ? ` ${duration % 60} min` : ''}`;

  return (
    <View style={{ gap: t.space.lg }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: t.space.lg }}>
        {(['start', 'end'] as const).map(which => (
          <View key={which} style={{ flex: 1 }}>
            <PressableScale label={`${controls[which]}: ${which === 'start' ? start : end}`} onPress={() => onChoose(which)}>
              <View style={{ alignItems: 'center', gap: t.space.xs }}>
                <Label variant="label">{controls[which]}</Label>
                <Label variant="section" style={{ fontSize: 28, lineHeight: 34 }}>{which === 'start' ? start : end}</Label>
              </View>
            </PressableScale>
          </View>
        ))}
      </View>
      <View testID="schedule-dial" {...responders.panHandlers} style={{ width: size, height: size, alignSelf: 'center' }}>
        <View pointerEvents="none" accessible accessibilityRole="image"
          accessibilityLabel={allDay ? 'Blocking window all day' : `Blocking window from ${start} to ${end}`}>
          <Svg width={size} height={size} viewBox={`0 0 ${SIZE} ${SIZE}`} accessible={false}>
            <Circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none" stroke={t.border.divider} strokeWidth={30} />
            <Circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none" stroke={t.brand.primary} strokeWidth={30}
              strokeLinecap="round" strokeDasharray={`${CIRCUMFERENCE * duration / 1440} ${CIRCUMFERENCE}`}
              rotation={-90 + preview.start / 4} origin={`${CENTER}, ${CENTER}`} />
            {Array.from({ length: 96 }, (_, index) => {
              const major = index % 4 === 0;
              const a = dialPoint(index * 15, CENTER, major ? 123 : 128);
              const b = dialPoint(index * 15, CENTER, 132);
              return <Line key={index} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke={t.text.primary} strokeWidth={major ? 1.5 : 0.7} />;
            })}
            {Array.from({ length: 12 }, (_, index) => {
              const hour = index * 2;
              const p = dialPoint(hour * 60, CENTER, 99);
              const cardinal = hour % 6 === 0;
              const label = hour === 0 ? '12 AM' : hour === 6 ? '6 AM' : hour === 12 ? '12 PM' : hour === 18 ? '6 PM' : String(hour % 12);
              return <SvgText key={hour} x={p.x} y={p.y + 5} textAnchor="middle" fill={t.text.primary}
                fontSize={cardinal ? 15 : 13} fontWeight={cardinal ? '700' : '500'}>{label}</SvgText>;
            })}
            {(['start', 'end'] as const).map(which => (
              <G key={which} transform={`translate(${points[which].x - 18}, ${points[which].y - 18})`}>
                <Circle cx={18} cy={18} r={16} fill={t.surface.solid} stroke={t.brand.primary} strokeWidth={3} />
                <SvgText x={18} y={23} textAnchor="middle" fontSize={14} fontWeight="700" fill={t.text.primary}>{which === 'start' ? 'S' : 'E'}</SvgText>
              </G>
            ))}
          </Svg>
        </View>
        {(['start', 'end'] as const).map(which => (
          <View key={which} pointerEvents="none" accessible accessibilityRole="adjustable"
            accessibilityLabel={which === 'start' ? 'Blocking start time' : 'Blocking end time'}
            accessibilityHint="Swipe up or down to adjust by one minute."
            accessibilityValue={{ min: 0, max: 1425, now: preview[which], text: which === 'start' ? start : end }}
            accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
            onAccessibilityAction={event => {
              const action = event.nativeEvent.actionName;
              if (action !== 'increment' && action !== 'decrement') return;
              const minute = boundedMinute(which, preview[which] + (action === 'increment' ? 1 : -1), preview.start, preview.end);
              setPreview({ ...preview, [which]: minute });
              onChange(which, minute);
            }}
            style={{ position: 'absolute', left: points[which].x / SIZE * size - 22, top: points[which].y / SIZE * size - 22, width: 44, height: 44 }} />
        ))}
      </View>
      <Label variant="section" style={{ textAlign: 'center' }}>{durationText}</Label>
    </View>
  );
}
