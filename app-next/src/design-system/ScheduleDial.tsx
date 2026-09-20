import { useEffect } from 'react';
import { Switch, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import Animated, { useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import { Label } from './Label';
import { PressableScale } from './PressableScale';
import { tokens as t } from './tokens';
import { controls } from '../content/controls';
import { feedback } from '../motion/haptics';
import { useMotion } from '../motion/useMotion';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const SIZE = 260;
const CENTER = SIZE / 2;
const RADIUS = 96;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** A 24-hour schedule at a glance. Time badges retain the precise wheel editor. */
export function ScheduleDial({
  start,
  end,
  startMinute,
  endMinute,
  allDay,
  onAllDay,
  onChoose,
}: {
  start: string;
  end: string;
  startMinute: number;
  endMinute: number;
  allDay: boolean;
  onAllDay: (value: boolean) => void;
  onChoose: (which: 'start' | 'end') => void;
}) {
  const motion = useMotion();
  const duration = allDay ? 1440 : (endMinute - startMinute + 1440) % 1440;
  const progress = useSharedValue(duration / 1440);
  const angle = useSharedValue(-90 + startMinute / 4);
  useEffect(() => {
    progress.set(
      motion.reduced
        ? duration / 1440
        : withTiming(duration / 1440, { duration: motion.duration.sheet }),
    );
    angle.set(
      motion.reduced
        ? -90 + startMinute / 4
        : withTiming(-90 + startMinute / 4, { duration: motion.duration.sheet }),
    );
  }, [angle, duration, motion.duration.sheet, motion.reduced, progress, startMinute]);
  const arc = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - progress.get()),
    rotation: angle.get(),
  }));
  return (
    <View style={{ gap: t.space.md }}>
      <View style={{ flexDirection: 'row', gap: t.space.md }}>
        <PressableScale label={`${controls.start}: ${start}`} onPress={() => onChoose('start')} style={{ flex: 1 }}>
          <View style={{ alignItems: 'center', gap: t.space.xs }}>
            <Label variant="support" tone="secondary">{controls.start}</Label>
            <Label variant="section">{start}</Label>
          </View>
        </PressableScale>
        <PressableScale label={`${controls.end}: ${end}`} onPress={() => onChoose('end')} style={{ flex: 1 }}>
          <View style={{ alignItems: 'center', gap: t.space.xs }}>
            <Label variant="support" tone="secondary">{controls.end}</Label>
            <Label variant="section">{end}</Label>
          </View>
        </PressableScale>
      </View>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={allDay ? 'Blocking window all day' : `Blocking window from ${start} to ${end}`}
        style={{ width: SIZE, height: SIZE, alignSelf: 'center', alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} accessible={false}>
          <Circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none" stroke={t.border.divider} strokeWidth={22} />
          <AnimatedCircle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            origin={`${CENTER}, ${CENTER}`}
            fill="none"
            stroke={t.brand.primary}
            strokeWidth={22}
            strokeLinecap="round"
            strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
            animatedProps={arc}
          />
          {Array.from({ length: 24 }, (_, hour) => {
            const angle = (hour / 24) * Math.PI * 2 - Math.PI / 2;
            const inner = hour % 6 === 0 ? 74 : 80;
            const outer = 84;
            return (
              <Line
                key={hour}
                x1={CENTER + Math.cos(angle) * inner}
                y1={CENTER + Math.sin(angle) * inner}
                x2={CENTER + Math.cos(angle) * outer}
                y2={CENTER + Math.sin(angle) * outer}
                stroke={t.text.secondary}
                strokeWidth={hour % 6 === 0 ? t.stroke.selected : t.stroke.hairline}
                strokeLinecap="round"
              />
            );
          })}
        </Svg>
        <Label variant="support" style={{ position: 'absolute', top: 48 }}>12 AM</Label>
        <Label variant="support" style={{ position: 'absolute', right: 42 }}>6 AM</Label>
        <Label variant="support" style={{ position: 'absolute', bottom: 48 }}>12 PM</Label>
        <Label variant="support" style={{ position: 'absolute', left: 46 }}>6 PM</Label>
        <Label variant="label" style={{ position: 'absolute' }}>
          {allDay ? controls.allDay : `${Math.floor(duration / 60)}h${duration % 60 ? ` ${duration % 60}m` : ''}`}
        </Label>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Label>{controls.allDay}</Label>
        <Switch
          accessibilityRole="switch"
          accessibilityLabel={controls.allDay}
          value={allDay}
          onValueChange={(value) => { feedback(); onAllDay(value); }}
          trackColor={{ true: t.state.switchOn, false: t.border.divider }}
        />
      </View>
    </View>
  );
}
