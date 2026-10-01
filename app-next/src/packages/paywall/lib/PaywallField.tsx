import { useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { illustrationTokens as art } from '../../ui/illustrationTokens';
import { Icon, type IconName } from '../../ui/Icon';
import { popInAt } from '../../ui/presets';
import { useMotion } from '../../ui/useMotion';
import { tokens as t } from '../../ui/tokens';
import { BrandMark } from '../../onboarding/BrandMark';
import { BlockedBadge } from '../../onboarding/BlockedBadge';
import { exerciseGlyphs, type ExerciseGlyph } from './exerciseGlyphs';

const field = art.paywall;
export const fieldMinimum = field.minField;
type FieldBrand = keyof typeof field.brands;
type Exercise = (typeof field.exercise)[number];
type Spot = { key: string; x: number; y: number; opacity: number; delay: number } & (
  | { kind: 'brand'; brand: FieldBrand }
  | { kind: 'exercise'; exercise: Exercise; look: number }
);

function layout(width: number, height: number, corner: { right: number; top: number; bottom: number }): Spot[] {
  const { size, pitch } = field.tile,
    angle = (field.tilt * Math.PI) / 180,
    cos = Math.cos(angle),
    sin = Math.sin(angle),
    planeWidth = width * Math.abs(cos) + height * Math.abs(sin) + pitch * 2,
    planeHeight = width * Math.abs(sin) + height * Math.abs(cos) + pitch * 2,
    rows = Math.ceil(planeHeight / pitch),
    columns = Math.ceil(planeWidth / pitch) + 1,
    fadeTop = height * (1 - field.fade),
    spots: Spot[] = [];
  let brands = 0,
    exercises = 0;
  for (let row = 0; row < rows; row++)
    for (let column = 0; column < columns; column++) {
      const localX = column * pitch + (row % 2) * (pitch / 2) - planeWidth / 2,
        localY = row * pitch - planeHeight / 2,
        x = width / 2 + localX * cos - localY * sin,
        y = height / 2 + localX * sin + localY * cos;
      if (x < -size || x > width + size || y < -size || y > height) continue;
      if (x - size / 2 < corner.right && y + size / 2 > corner.top && y - size / 2 < corner.bottom) continue;
      const opacity = Math.min(1, Math.max(0, (height - y - size * 0.5) / (height - fadeTop)));
      if (opacity < 0.04) continue;
      const delay = Math.max(0, y) / pitch * field.cascade.row + Math.max(0, x) / pitch * field.cascade.column,
        base = { key: `${row}-${column}`, x: x - size / 2, y: y - size / 2, opacity, delay };
      if ((row + column) % 3 === 1) {
        spots.push({ ...base, kind: 'exercise', exercise: field.exercise[exercises % field.exercise.length], look: exercises % 2 });
        exercises++;
      } else {
        spots.push({ ...base, kind: 'brand', brand: field.order[(brands + row * 5) % field.order.length] });
        brands++;
      }
    }
  return spots;
}

export function PaywallField({ bottom }: { bottom: number }) {
  const m = useMotion(),
    insets = useSafeAreaInsets(),
    box = useRef<View>(null),
    [frame, setFrame] = useState({ top: 0, width: 0 }),
    height = Math.max(0, bottom - frame.top),
    headerTop = insets.top - frame.top,
    spots = useMemo(
      () =>
        frame.width && height
          ? layout(frame.width, height, { right: t.layout.page + t.control.inline, top: headerTop, bottom: headerTop + t.layout.header })
          : [],
      [frame.width, height, headerTop],
    );
  return (
    <View
      ref={box}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      onLayout={(event) => {
        const width = event.nativeEvent.layout.width;
        box.current?.measureInWindow((_, top) => setFrame({ top, width }));
      }}
      style={{ position: 'absolute', left: 0, right: 0, top: 0, height: Math.max(height, field.minField), overflow: 'hidden' }}>
      {spots.map((spot) => (
        <Animated.View
          key={spot.key}
          entering={popInAt(m.reduced, spot.delay)}
          testID={spot.kind === 'brand' ? `locked-app-${spot.brand}` : `exercise-${spot.exercise}`}
          style={{ position: 'absolute', left: spot.x, top: spot.y, opacity: spot.opacity }}>
          <View style={{ transform: [{ rotate: `${field.tilt}deg` }] }}>
            {spot.kind === 'brand' ? <LockedApp brand={spot.brand} /> : <ExerciseTile exercise={spot.exercise} look={spot.look} />}
          </View>
        </Animated.View>
      ))}
    </View>
  );
}

function LockedApp({ brand }: { brand: FieldBrand }) {
  const look: { fill: string; glyph: string; outline?: string } = field.brands[brand],
    { size, radius } = field.tile;
  return (
    <View style={{ width: size, height: size }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          overflow: 'hidden',
          backgroundColor: look.fill === 'gradient' ? undefined : look.fill,
        }}>
        {look.fill === 'gradient' ? (
          <LinearGradient
            colors={art.welcome.brands.instagram}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ position: 'absolute', inset: 0 }}
          />
        ) : null}
        <BrandMark brand={brand} color={look.glyph} outline={look.outline} />
        <View style={{ position: 'absolute', inset: 0, backgroundColor: art.welcome.tile.blockedVeil }} />
      </View>
      <BlockedBadge variant="lock" size={field.tile.badge} offset={field.tile.badgeOffset} />
    </View>
  );
}

function ExerciseTile({ exercise, look }: { exercise: Exercise; look: number }) {
  const { size, radius, glyph } = field.tile,
    colors = field.exerciseLooks[look],
    mark = size * glyph,
    drawn = exercise in exerciseGlyphs ? exerciseGlyphs[exercise as ExerciseGlyph] : null;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        borderWidth: t.stroke.hairline,
        borderColor: colors.outline,
        backgroundColor: colors.fill,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      {drawn ? (
        <Svg width={mark} height={mark} viewBox={drawn.viewBox} accessible={false}>
          <Path d={drawn.path} fill={colors.glyph} />
        </Svg>
      ) : (
        <Icon name={exercise as IconName} size={mark} tone={look ? 'onAccent' : 'accent'} variant="utility" />
      )}
    </View>
  );
}
