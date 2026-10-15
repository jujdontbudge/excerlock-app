import { useEffect, useRef, useState } from 'react';
import { StyleProp, TextStyle, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  FadeInUp,
  FadeOutDown,
  FadeOutUp,
  LayoutAnimationConfig,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { Label } from './Label';
import { tokens as t } from './tokens';
import { useMotion } from './useMotion';

type Variant = keyof typeof t.type;
type Direction = 1 | -1;

const strip = Array.from({ length: 30 }, (_, i) => i % 10);
const rollCurve = Easing.bezier(...t.motion.easing.enter);
const isDigit = (char: string) => char >= '0' && char <= '9';
const isLetter = (char: string) => char.toLowerCase() !== char.toUpperCase();
const slotDuration = t.motion.reward.roll;
const slotEnter = (direction: Direction, distance: number) =>
  (direction > 0 ? FadeInDown : FadeInUp)
    .withInitialValues({ opacity: 0, translateY: direction * distance })
    .duration(slotDuration)
    .easing(rollCurve);
const slotExit = (direction: Direction) =>
  (direction > 0 ? FadeOutUp : FadeOutDown)
    .duration(slotDuration * 0.35)
    .easing(rollCurve);
const slotLayout = LinearTransition.duration(slotDuration).easing(rollCurve);
const unitEnter = FadeIn.duration(slotDuration).easing(rollCurve);
const unitExit = FadeOut.duration(slotDuration * 0.35).easing(rollCurve);

type Slot = { char: string; key: string; kind: 'digit' | 'unit' | 'separator'; order: number };

function slotsKeptAcrossValues(text: string): Slot[] {
  const chars = [...text];
  const unitAfter = (from: number) => chars.slice(from).find(isLetter) ?? '';
  const slots: Slot[] = [];
  for (let i = 0; i < chars.length; i += 1) {
    const char = chars[i];
    if (isLetter(char)) {
      slots.push({ char, key: `u${char}`, kind: 'unit', order: 0 });
      continue;
    }
    let end = i;
    while (end + 1 < chars.length && (isDigit(chars[end + 1]) || (chars[end + 1] === ',' && isDigit(chars[end + 2] ?? ''))))
      end += 1;
    if (isDigit(char)) {
      const unit = unitAfter(end + 1);
      for (let j = i; j <= end; j += 1) {
        const place = chars.slice(j + 1, end + 1).filter(isDigit).length;
        slots.push(
          isDigit(chars[j])
            ? { char: chars[j], key: `d${unit}${place}`, kind: 'digit', order: place }
            : { char: chars[j], key: `s${unit}${place}${chars[j]}`, kind: 'separator', order: 0 },
        );
      }
      i = end;
      continue;
    }
    const before = chars.slice(0, i).reverse().find((c) => c !== ' ') ?? '';
    slots.push({
      char,
      key: isLetter(before) ? `s${before}>${char}` : `s${unitAfter(i)}${char}`,
      kind: 'separator',
      order: 0,
    });
  }
  return slots;
}

export const formatPoints = (value: number) => Math.max(0, Math.round(value)).toLocaleString('en-US');

export function RollingNumber({
  value,
  format = formatPoints,
  variant = 'metric',
  tone = 'primary',
  color,
  label,
  unitTone,
}: {
  value: number;
  format?: (value: number) => string;
  variant?: Variant;
  tone?: keyof typeof t.text;
  color?: string;
  label?: string;
  unitTone?: keyof typeof t.text;
}) {
  const text = format(value);
  const [last, setLast] = useState<{ value: number; direction: Direction }>({ value, direction: 1 });
  if (last.value !== value) setLast({ value, direction: value > last.value ? 1 : -1 });
  const direction = last.direction;
  const slots = slotsKeptAcrossValues(text);
  const style: StyleProp<TextStyle> = color ? { color } : undefined;
  const m = useMotion();
  const { fontScale } = useWindowDimensions();
  const distance = t.type[variant].lineHeight * Math.min(fontScale, t.a11y.textScale) * 0.6;
  const enter = m.reduced ? undefined : slotEnter(direction, distance);
  const exit = m.reduced ? undefined : slotExit(direction);
  const layout = m.reduced ? undefined : slotLayout;
  return (
    <LayoutAnimationConfig skipEntering>
      <Animated.View
        accessible
        accessibilityRole="text"
        accessibilityLabel={label ?? text}
        layout={layout}
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
        {slots.map((slot) => (
          <Animated.View
            key={slot.key}
            entering={slot.kind === 'digit' ? enter : slot.kind === 'unit' && !m.reduced ? unitEnter : undefined}
            exiting={slot.kind === 'digit' ? exit : slot.kind === 'unit' && !m.reduced ? unitExit : undefined}
            layout={layout}>
            {slot.kind === 'digit' ? (
              <DigitColumn
                digit={Number(slot.char)}
                direction={direction}
                order={slot.order}
                variant={variant}
                tone={tone}
                style={style}
              />
            ) : (
              <Label variant={variant} tone={unitTone ?? tone} style={unitTone ? undefined : style}>
                {slot.char}
              </Label>
            )}
          </Animated.View>
        ))}
      </Animated.View>
    </LayoutAnimationConfig>
  );
}

function DigitColumn({
  digit,
  direction,
  order,
  variant,
  tone,
  style,
}: {
  digit: number;
  direction: Direction;
  order: number;
  variant: Variant;
  tone: keyof typeof t.text;
  style: StyleProp<TextStyle>;
}) {
  const m = useMotion();
  const { fontScale } = useWindowDimensions();
  const row = t.type[variant].lineHeight * Math.min(fontScale, t.a11y.textScale);
  const position = useSharedValue(10 + digit);
  const shown = useRef(digit);
  useEffect(() => {
    if (shown.current === digit) return;
    shown.current = digit;
    if (m.reduced) {
      position.set(10 + digit);
      return;
    }
    let from = position.get();
    if (direction > 0 && from > 19) from -= 10;
    if (direction < 0 && from < 10) from += 10;
    position.set(from);
    const target =
      direction > 0
        ? from + ((digit - Math.round(from) + 10) % 10 || 10)
        : from - ((Math.round(from) - digit + 10) % 10 || 10);
    position.set(
      withDelay(
        order * t.motion.reward.rollStagger,
        withTiming(Math.round(target), { duration: t.motion.reward.roll, easing: rollCurve }),
      ),
    );
  }, [digit, direction, order, m.reduced, position]);
  const roll = useAnimatedStyle(() => ({ transform: [{ translateY: -position.get() * row }] }));
  return (
    <View style={{ height: row, overflow: 'hidden' }}>
      <Animated.View style={roll}>
        {strip.map((n, i) => (
          <View key={i} style={{ height: row, justifyContent: 'center' }}>
            <Label variant={variant} tone={tone} style={[{ textAlign: 'center' }, style]}>
              {n}
            </Label>
          </View>
        ))}
      </Animated.View>
    </View>
  );
}
