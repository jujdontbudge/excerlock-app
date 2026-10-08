import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { Label, PressableScale } from '../../ui';
import { scheduleHaptic } from '../../ui/haptics';
import { useMotion } from '../../ui/useMotion';
import { tokens as t } from '../../ui/tokens';
import { subscriptionCopy } from '../../subscription/subscriptionCopy';

const beat = t.motion.duration.press / 2,
  look = {
    track: { width: t.control.full - t.space.xs, height: t.control.indicator, inset: (t.control.indicator - t.layout.thumb) / 2 },
    stretch: 1.35,
    ring: 1.14,
    pop: 1.04,
    linger: 1.6,
    sparks: 24,
    spark: { size: t.space.md, near: t.space.xxl, far: t.control.full * 2 },
    sparkColors: [t.brand.lockHighlight, t.brand.decorative, t.swatch.yellow, t.brand.light, t.brand.primary],
    haptics: {
      on: [['tap', 0], ['detent', beat], ['detent', beat * 2], ['lock', beat * 3], ['success', beat * 6]],
      off: [['tap', 0], ['beat', beat * 3]],
    },
  } as const,
  knob = t.layout.thumb,
  travel = look.track.width - knob - look.track.inset * 2,
  clamp = (value: number) => {
    'worklet';
    return Math.min(1, Math.max(0, value));
  };

export function TrialSwitch({ on, locked, onToggle }: { on: boolean; locked: boolean; onToggle: (next: boolean) => void }) {
  const m = useMotion(),
    progress = useSharedValue(on ? 1 : 0),
    stretch = useSharedValue(1),
    burst = useSharedValue(0),
    ring = useSharedValue(0),
    row = useSharedValue(1),
    cues = useRef<(() => void)[]>([]);
  useEffect(() => {
    progress.value = m.spring(on ? 1 : 0, 'pop');
  }, [on, m, progress]);
  useEffect(() => () => cues.current.forEach((cancel) => cancel()), []);
  const press = () => {
    if (locked) return;
    const next = !on;
    cues.current.forEach((cancel) => cancel());
    cues.current = look.haptics[next ? 'on' : 'off'].map(([kind, delay]) => scheduleHaptic(kind, delay));
    stretch.value = m.sequence(m.timing(look.stretch, 'press'), m.spring(1, 'pop'));
    if (next) {
      burst.value = 0;
      burst.value = m.timing(1, 'emphasized', { curve: 'enter', stretch: look.linger });
      ring.value = 0;
      ring.value = m.timing(1, 'emphasized', { curve: 'enter', stretch: look.linger });
      row.value = m.sequence(m.timing(look.pop, 'press'), m.spring(1, 'pop'));
    }
    onToggle(next);
  };
  const track = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(clamp(progress.value), [0, 1], [t.border.divider, t.state.switchOn]),
  }));
  const thumb = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * travel }, { scaleX: stretch.value }],
  }));
  const lift = useAnimatedStyle(() => ({ transform: [{ scale: row.value }] }));
  const glow = useAnimatedStyle(() => ({
    opacity: ring.value === 0 ? 0 : 1 - ring.value,
    transform: [{ scale: 1 + (look.ring - 1) * ring.value }],
  }));
  return (
    <Animated.View style={[{ zIndex: 2 }, lift]}>
      <PressableScale
        label={on ? subscriptionCopy.trialOn : subscriptionCopy.trialOff}
        accessibilityRole="switch"
        accessibilityState={{ checked: on, disabled: locked }}
        haptic="none"
        onPress={press}>
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              inset: 0,
              borderRadius: t.radius.card,
              borderWidth: t.stroke.chart,
              borderColor: t.brand.decorative,
            },
            glow,
          ]}
        />
        <Animated.View
          style={{
            height: t.control.full,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: t.space.lg,
            borderRadius: t.radius.card,
            borderWidth: t.stroke.hairline,
            borderColor: t.surface.transparent,
            backgroundColor: t.surface.softChoice,
          }}>
          <Label variant="label" style={{ flex: 1, textAlign: 'left' }}>
            {on ? subscriptionCopy.trialOn : subscriptionCopy.trialOff}
          </Label>
          <Animated.View
            style={[
              {
                width: look.track.width,
                height: look.track.height,
                borderRadius: t.radius.pill,
                padding: look.track.inset,
              },
              track,
            ]}>
            <Animated.View
              style={[
                {
                  width: knob,
                  height: knob,
                  borderRadius: t.radius.pill,
                  backgroundColor: t.surface.card,
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: t.shadow.control,
                },
                thumb,
              ]}
            />
          </Animated.View>
        </Animated.View>
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            right: t.space.lg + look.track.inset,
            top: t.control.full / 2,
            width: knob,
            height: 0,
          }}>
          {Array.from({ length: look.sparks }, (_, index) => (
            <Spark key={index} index={index} burst={burst} />
          ))}
        </View>
      </PressableScale>
    </Animated.View>
  );
}

function Spark({ index, burst }: { index: number; burst: SharedValue<number> }) {
  const { size, near, far } = look.spark,
    angle = (index / look.sparks) * Math.PI * 2 + (index % 3) * 0.21,
    distance = near + (far - near) * (((index * 7) % 10) / 9),
    round = index % 2 === 0,
    color = look.sparkColors[index % look.sparkColors.length];
  const style = useAnimatedStyle(() => ({
    opacity: burst.value === 0 ? 0 : 1 - burst.value * burst.value,
    transform: [
      { translateX: Math.cos(angle) * distance * burst.value },
      { translateY: Math.sin(angle) * distance * burst.value },
      { rotate: `${burst.value * 240 * (round ? 1 : -1)}deg` },
      { scale: 1 - burst.value * 0.6 },
    ],
  }));
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: knob / 2 - size / 2,
          top: -size / 2,
          width: round ? size : size / 2,
          height: size,
          borderRadius: round ? t.radius.pill : t.stroke.hairline,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}
