import { useCallback, useMemo, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import Svg, { Circle, G, Line, Text as SvgText } from 'react-native-svg';
import { Label } from '../ui/Label';
import { PressableScale } from '../ui/PressableScale';
import { tokens as t } from '../ui/tokens';
import { controls } from '../ui/controlsCopy';
import { minuteLabel } from './scheduleLabel';
import { haptic } from '../ui/haptics';
import { boundedMinute, dialMinute, dialPoint, nearestHandle, ScheduleHandle } from './lib/scheduleDialMath';

const SIZE = 360;
const CENTER = SIZE / 2;
const RADIUS = 154;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const SMALLEST = SIZE * 0.8;

export function ScheduleDial({
  startMinute, endMinute, allDay, onChange, onChoose,
}: {
  startMinute: number;
  endMinute: number;
  allDay: boolean;
  onChange: (which: ScheduleHandle, minute: number) => void;
  onChoose: (which: ScheduleHandle) => void;
}) {
  const { width, fontScale } = useWindowDimensions();
  const widest = Math.min(width - t.layout.page * 2, 420);
  const caption = t.type.section.lineHeight * Math.min(fontScale, t.a11y.textScale);
  const [room, setRoom] = useState<number>();
  const size = Math.max(SMALLEST, Math.min(widest, (room ?? 0) - caption - t.space.lg));
  const [draft, setDraft] = useState<{ start: number; end: number } | null>(null);
  const preview = draft ?? { start: startMinute, end: endMinute };
  const dragging = draft !== null;
  const active = useSharedValue<ScheduleHandle | null>(null);
  const shown = useSharedValue({ start: startMinute, end: endMinute });

  const grab = useCallback((current: { start: number; end: number }) => {
    setDraft(current);
    haptic('select');
  }, []);
  const drop = useCallback((which: ScheduleHandle, minute: number, success: boolean) => {
    onChange(which, minute);
    setDraft(null);
    if (success) haptic('select');
  }, [onChange]);
  const drag = useMemo(() => {
    const scale = SIZE / size;
    return Gesture.Pan()
      .manualActivation(true)
      .onTouchesDown((event, manager) => {
        if (event.numberOfTouches !== 1) return;
        const touch = event.allTouches[0];
        if (Math.abs(Math.hypot(touch.x * scale - CENTER, touch.y * scale - CENTER) - RADIUS) <= 28) manager.activate();
        else manager.fail();
      })
      .onStart((event) => {
        const current = { start: startMinute, end: endMinute };
        shown.set(current);
        active.set(nearestHandle(dialMinute(event.x * scale, event.y * scale, CENTER), current.start, current.end));
        scheduleOnRN(grab, current);
      })
      .onUpdate((event) => {
        const which = active.get();
        if (which === null) return;
        const p = shown.get();
        const value = boundedMinute(which, dialMinute(event.x * scale, event.y * scale, CENTER), p.start, p.end);
        if (p[which] === value) return;
        if (Math.floor(p[which] / 60) !== Math.floor(value / 60)) scheduleOnRN(haptic, 'detent');
        const next = { ...p, [which]: value };
        shown.set(next);
        scheduleOnRN(setDraft, next);
      })
      .onFinalize((_event, success) => {
        const which = active.get();
        if (which === null) return;
        active.set(null);
        scheduleOnRN(drop, which, shown.get()[which], success);
      });
  }, [size, startMinute, endMinute, active, shown, grab, drop]);

  const start = minuteLabel(preview.start);
  const end = minuteLabel(preview.end);
  const duration = allDay && !dragging ? 1440 : (preview.end - preview.start + 1440) % 1440;
  const points = { start: dialPoint(preview.start, CENTER, RADIUS), end: dialPoint(preview.end, CENTER, RADIUS) };
  const durationText = `${Math.floor(duration / 60)} hr${duration % 60 ? ` ${duration % 60} min` : ''}`;

  return (
    <View style={{ flexGrow: 1, gap: t.space.lg }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: t.space.lg }}>
        {(['start', 'end'] as const).map(which => (
          <View key={which} style={{ flex: 1 }}>
            <PressableScale label={`${controls[which]}: ${which === 'start' ? start : end}`} onPress={() => onChoose(which)}>
              <View style={{ alignItems: 'center', gap: t.space.xs }}>
                <Label variant="label">{controls[which]}</Label>
                <Label variant="metricSmall">{which === 'start' ? start : end}</Label>
              </View>
            </PressableScale>
          </View>
        ))}
      </View>
      <View
        onLayout={(event) => setRoom(event.nativeEvent.layout.height)}
        style={{ flexGrow: 1, minHeight: SMALLEST + t.space.lg + caption }}>
      {room === undefined ? null : (
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center', gap: t.space.lg }}>
      <GestureDetector gesture={drag}>
      <View testID="schedule-dial" style={{ width: size, height: size }}>
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
                fontSize={(cardinal ? t.type.label : t.type.support).fontSize}
                fontFamily={(cardinal ? t.type.label : t.type.support).fontFamily}>{label}</SvgText>;
            })}
            {(['start', 'end'] as const).map(which => (
              <G key={which} transform={`translate(${points[which].x - 18}, ${points[which].y - 18})`}>
                <Circle cx={18} cy={18} r={16} fill={t.surface.card} stroke={t.brand.primary} strokeWidth={3} />
                <SvgText x={18} y={24} textAnchor="middle" fontSize={t.type.label.fontSize} fontFamily={t.type.label.fontFamily} fill={t.text.primary}>{which === 'start' ? 'S' : 'E'}</SvgText>
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
              onChange(which, minute);
            }}
            style={{ position: 'absolute', left: points[which].x / SIZE * size - 22, top: points[which].y / SIZE * size - 22, width: 44, height: 44 }} />
        ))}
      </View>
      </GestureDetector>
      <Label variant="section" style={{ textAlign: 'center' }}>{durationText}</Label>
      </View>
      )}
      </View>
    </View>
  );
}
