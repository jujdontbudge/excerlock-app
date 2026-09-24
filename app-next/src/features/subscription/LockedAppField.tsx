import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { illustrationTokens as art } from '../../design-system/illustrationTokens';
import { fadeIn } from '../../motion/presets';
import { BrandMark } from '../onboarding/welcome/BrandMark';
import { BlockedBadge } from '../onboarding/welcome/BlockedBadge';

const field = art.paywall;
type FieldBrand = keyof typeof field.brands;

/**
 * A wall of locked social apps behind the paywall phone, in straight rows. The columns beside the
 * phone are centred on its edges so each tile there is half tucked behind it; further columns run
 * out past the screen edges. Every app appears once: spots are filled row by row, the most visible
 * columns first so the best-known feeds show whole, and any spots beyond the list stay empty at the
 * bottom, where the fade covers them.
 */
export function LockedAppField({
  width,
  height,
  phone,
}: {
  width: number;
  height: number;
  phone: { left: number; width: number };
}) {
  const { size, pitch, top } = field.tile,
    inner = [phone.left - size / 2, phone.left + phone.width - size / 2];
  const columns: { x: number; ring: number }[] = [];
  for (let ring = 0; ; ring++) {
    const left = inner[0] - ring * pitch,
      right = inner[1] + ring * pitch;
    if (left + size <= 0 && right >= width) break;
    if (left + size > 0) columns.push({ x: left, ring });
    if (right < width) columns.push({ x: right, ring });
  }
  // How much of a tile in this column shows, clear of the screen edges and the phone.
  const shown = (x: number) =>
    Math.min(x + size, width, Math.max(x, phone.left)) -
    Math.max(x, 0) +
    Math.max(0, Math.min(x + size, width) - Math.max(x, phone.left + phone.width));
  columns.sort((a, b) => shown(b.x) - shown(a.x) || a.ring - b.ring);
  const spots: { x: number; y: number; brand: FieldBrand }[] = [];
  for (let row = 0; top + row * pitch < height; row++)
    for (const column of columns) {
      const brand = field.order[spots.length];
      if (!brand) break;
      spots.push({ x: column.x, y: top + row * pitch, brand });
    }
  return (
    // The wall holds still and fades in once with the page; only the phone and the offer move.
    <Animated.View
      entering={fadeIn}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ position: 'absolute', left: 0, top: 0, width, height, opacity: field.fieldOpacity }}>
      {spots.map((spot) => (
        <View
          key={spot.brand}
          testID={`locked-app-${spot.brand}`}
          style={{ position: 'absolute', left: spot.x, top: spot.y }}>
          <LockedApp brand={spot.brand} />
        </View>
      ))}
    </Animated.View>
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
