import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { illustrationTokens as art } from '../../../ui/illustrationTokens';
import { tokens as t } from '../../../ui/tokens';
import { welcomeCopy as c } from '../welcomeCopy';
import { Reveal } from '../../../ui/Reveal';
import { BrandMark } from '../../BrandMark';
import { BlockedBadge } from '../../BlockedBadge';
export function LockedAppsRow() {
  const p = art.welcome.control.locked;
  return (
    <Reveal index={0}>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={c.lockedApps}
        style={{ flexDirection: 'row', justifyContent: 'center', gap: p.gap }}>
        {art.welcome.tiles.map((tile) => (
          <View
            key={tile.name}
            style={{
              width: p.size,
              height: p.size,
              borderRadius: p.radius,
              backgroundColor:
                tile.name === 'whatsapp' ? art.welcome.brands.whatsapp : tile.name === 'tiktok' ? art.welcome.brands.tiktok : t.surface.subtle,
              boxShadow: art.welcome.tile.shadow,
            }}>
            {tile.name === 'instagram' ? (
              <LinearGradient
                colors={art.welcome.brands.instagram}
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
