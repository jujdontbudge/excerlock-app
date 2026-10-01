import { useMemo, useRef, useState } from 'react';
import { Image, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { illustrationTokens as art } from '../../ui/illustrationTokens';
import { popInAt } from '../../ui/presets';
import { useMotion } from '../../ui/useMotion';
import { tokens as t } from '../../ui/tokens';
import { BrandMark } from '../../onboarding/BrandMark';
import { BlockedBadge } from '../../onboarding/BlockedBadge';

const field = art.paywall;
export const fieldMinimum = field.minField;
const appIcons: Partial<Record<FieldBrand, number>> = {
  tiktok: require('../../../../assets/paywall/apps/tiktok.jpg'),
  instagram: require('../../../../assets/paywall/apps/instagram.jpg'),
  youtube: require('../../../../assets/paywall/apps/youtube.jpg'),
  x: require('../../../../assets/paywall/apps/x.jpg'),
  facebook: require('../../../../assets/paywall/apps/facebook.jpg'),
  reddit: require('../../../../assets/paywall/apps/reddit.jpg'),
  threads: require('../../../../assets/paywall/apps/threads.jpg'),
  netflix: require('../../../../assets/paywall/apps/netflix.jpg'),
  pinterest: require('../../../../assets/paywall/apps/pinterest.jpg'),
};
type FieldBrand = keyof typeof field.brands;
type Spot = { key: string; x: number; y: number; delay: number; opacity: number } & (
  | { kind: 'brand'; brand: FieldBrand }
  | { kind: 'exercise'; symbol: SFSymbol }
);

function layout(width: number, height: number, title: { top: number; bottom: number }): Spot[] {
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
      if (x < -size || x > width + size || y < -size || y > height) continue;
      const opacity = y + size * 0.2 < title.top ? 1 : y - size / 2 > title.bottom ? field.shade.card : field.shade.title;
      const delay = (Math.max(0, y) / pitch) * field.cascade.row + (Math.max(0, x) / pitch) * field.cascade.column,
        base = { key: `${row}-${column}`, x: x - size / 2, y: y - size / 2, delay, opacity };
      if ((row + column) % 3 === 1) {
        spots.push({ ...base, kind: 'exercise', symbol: field.exercise[exercises % field.exercise.length] as SFSymbol });
        exercises++;
      } else {
        spots.push({ ...base, kind: 'brand', brand: field.order[(brands * 3 + row * 4) % field.order.length] });
        brands++;
      }
    }
  return spots;
}

export function PaywallField({ bottom, title }: { bottom: number; title: { top: number; bottom: number } }) {
  const m = useMotion(),
    box = useRef<View>(null),
    [frame, setFrame] = useState({ top: 0, width: 0 }),
    height = Math.max(field.minField, bottom - frame.top),
    titleTop = title.top - frame.top,
    titleBottom = title.bottom - frame.top,
    spots = useMemo(
      () => (frame.width ? layout(frame.width, height, { top: titleTop, bottom: titleBottom }) : []),
      [frame.width, height, titleTop, titleBottom],
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
      style={{ position: 'absolute', left: 0, right: 0, top: 0, height, overflow: 'hidden' }}>
      {spots.map((spot) => (
        <Animated.View
          key={spot.key}
          entering={popInAt(m.reduced, spot.delay)}
          testID={spot.kind === 'brand' ? `locked-app-${spot.brand}` : `exercise-${spot.symbol}`}
          style={{ position: 'absolute', left: spot.x, top: spot.y, opacity: spot.opacity }}>
          <View style={{ transform: [{ rotate: `${field.tilt}deg` }] }}>
            {spot.kind === 'brand' ? <LockedApp brand={spot.brand} /> : <ExerciseMark symbol={spot.symbol} />}
          </View>
        </Animated.View>
      ))}
    </View>
  );
}

function LockedApp({ brand }: { brand: FieldBrand }) {
  const look: { fill: string; glyph: string; outline?: string } = field.brands[brand],
    { size, radius, zoom } = field.tile,
    icon = appIcons[brand];
  return (
    <View style={{ width: size, height: size }}>
      <View style={{ width: size, height: size, borderRadius: radius, overflow: 'hidden', backgroundColor: look.fill }}>
        {icon ? (
          <Image source={icon} style={{ width: size, height: size, transform: [{ scale: zoom }] }} />
        ) : (
          <BrandMark brand={brand} color={look.glyph} outline={look.outline} />
        )}
      </View>
      <BlockedBadge variant="lock" size={field.tile.badge} offset={field.tile.badgeOffset} />
    </View>
  );
}

function ExerciseMark({ symbol }: { symbol: SFSymbol }) {
  const { size, glyph } = field.tile;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <SymbolView name={symbol} size={size * glyph} tintColor={t.brand.primary} weight="semibold" resizeMode="scaleAspectFit" />
    </View>
  );
}
