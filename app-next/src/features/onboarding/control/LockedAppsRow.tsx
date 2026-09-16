import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { welcomeTokens as w } from '../../../design-system/welcomeTokens';
import { tokens as t } from '../../../design-system/tokens';
import { welcomeCopy as c } from '../../../content/welcome';
import { Reveal } from '../../../motion/Reveal';
import { BrandMark } from '../welcome/BrandMark';
import { BlockedBadge } from '../welcome/BlockedBadge';
/** The social apps, locked, in a single row above the activities that unlock them. */
export function LockedAppsRow() {
  const p = w.control.locked;
  return (
    <Reveal index={0}>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={c.lockedApps}
        style={{ flexDirection: 'row', justifyContent: 'center', gap: p.gap }}>
        {w.tiles.map((tile) => (
          <View
            key={tile.name}
            style={{
              width: p.size,
              height: p.size,
              borderRadius: p.radius,
              backgroundColor:
                tile.name === 'whatsapp' ? w.brands.whatsapp : tile.name === 'tiktok' ? w.brands.tiktok : t.surface.subtle,
              boxShadow: w.tile.shadow,
            }}>
            {tile.name === 'instagram' ? (
              <LinearGradient
                colors={w.brands.instagram}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ position: 'absolute', inset: 0, borderRadius: p.radius }}
              />
            ) : null}
            <BrandMark brand={tile.name} />
            <View
              pointerEvents="none"
              style={{ position: 'absolute', inset: 0, borderRadius: p.radius, backgroundColor: p.veil }}
            />
            <BlockedBadge variant="lock" size={p.badge} offset={p.badgeOffset} />
          </View>
        ))}
      </View>
    </Reveal>
  );
}
