import { useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { illustrationTokens as art } from '../../ui/illustrationTokens';
import { popInAt } from '../../ui/presets';
import { useMotion } from '../../ui/useMotion';
import { tokens as t } from '../../ui/tokens';
import { BrandMark } from '../../onboarding/BrandMark';
import { BlockedBadge } from '../../onboarding/BlockedBadge';

const field = art.paywall;
export const fieldMinimum = field.minField;
type FieldBrand = keyof typeof field.brands;
type Spot = { key: string; x: number; y: number; delay: number } & (
  | { kind: 'brand'; brand: FieldBrand }
  | { kind: 'exercise'; symbol: SFSymbol; fill: number }
);

function layout(width: number, height: number): Spot[] {
  const { size, pitch } = field.tile,
    angle = (field.tilt * Math.PI) / 180,
    cos = Math.cos(angle),
    sin = Math.sin(angle),
    planeWidth = width * Math.abs(cos) + height * Math.abs(sin) + pitch * 2,
    planeHeight = width * Math.abs(sin) + height * Math.abs(cos) + pitch * 2,
    rows = Math.ceil(planeHeight / pitch),
    columns = Math.ceil(planeWidth / pitch) + 1,
    spots: Spot[] = [];
  let brands = 0,
    exercises = 0;
  for (let row = 0; row < rows; row++)
    for (let column = 0; column < columns; column++) {
      const localX = column * pitch + (row % 2) * (pitch / 2) - planeWidth / 2,
        localY = row * pitch - planeHeight / 2,
        x = width / 2 + localX * cos - localY * sin,
        y = height / 2 + localX * sin + localY * cos;
      if (x < -size || x > width + size || y < -size || y > height + size / 2) continue;
      const delay = (Math.max(0, y) / pitch) * field.cascade.row + (Math.max(0, x) / pitch) * field.cascade.column,
        base = { key: `${row}-${column}`, x: x - size / 2, y: y - size / 2, delay };
      if ((row + column) % 3 === 1) {
        spots.push({
          ...base,
          kind: 'exercise',
          symbol: field.exercise[exercises % field.exercise.length] as SFSymbol,
          fill: exercises % field.exerciseFills.length,
        });
        exercises++;
      } else {
        spots.push({ ...base, kind: 'brand', brand: field.order[(brands + row * 3) % field.order.length] });
        brands++;
      }
    }
  return spots;
}

export function PaywallField({ bottom }: { bottom: number }) {
  const m = useMotion(),
    box = useRef<View>(null),
    [frame, setFrame] = useState({ top: 0, width: 0 }),
    height = Math.max(field.minField, bottom - frame.top),
    spots = useMemo(() => (frame.width ? layout(frame.width, height) : []), [frame.width, height]);
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
      style={{ position: 'absolute', left: 0, right: 0, top: 0, height, overflow: 'hidden' }}>
      {spots.map((spot) => (
        <Animated.View
          key={spot.key}
          entering={popInAt(m.reduced, spot.delay)}
          testID={spot.kind === 'brand' ? `locked-app-${spot.brand}` : `exercise-${spot.symbol}`}
          style={{ position: 'absolute', left: spot.x, top: spot.y }}>
          <View style={{ transform: [{ rotate: `${field.tilt}deg` }] }}>
            {spot.kind === 'brand' ? <LockedApp brand={spot.brand} /> : <ExerciseTile symbol={spot.symbol} fill={spot.fill} />}
          </View>
        </Animated.View>
      ))}
      <LinearGradient
        colors={t.paywall.fade}
        locations={[0, 0.32, 1]}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: height * field.fadeShare }}
      />
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
          borderWidth: t.stroke.hairline,
          borderColor: t.paywall.tileEdge,
          backgroundColor: look.fill === 'gradient' ? undefined : look.fill,
        }}>
        {look.fill === 'gradient' ? (
          <LinearGradient
            colors={art.welcome.brands.instagram}
            start={{ x: 0, y: 1 }}
            end={{ x: 1, y: 0 }}
            style={{ position: 'absolute', inset: 0 }}
          />
        ) : null}
        <View style={{ flex: 1, padding: size * (field.markInset[brand as keyof typeof field.markInset] ?? 0) }}>
          <BrandMark brand={brand} color={look.glyph} outline={look.outline} />
        </View>
      </View>
      <BlockedBadge variant="lock" size={field.tile.badge} offset={field.tile.badgeOffset} />
    </View>
  );
}

function ExerciseTile({ symbol, fill }: { symbol: SFSymbol; fill: number }) {
  const { size, radius, glyph } = field.tile;
  return (
    <LinearGradient
      colors={field.exerciseFills[fill]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ width: size, height: size, borderRadius: radius, alignItems: 'center', justifyContent: 'center' }}>
      <SymbolView name={symbol} size={size * glyph} tintColor={t.paywall.text} weight="semibold" resizeMode="scaleAspectFit" />
    </LinearGradient>
  );
}
