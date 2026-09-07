import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Rect } from 'react-native-svg';
import { profileTokens as p } from '../../../design-system/profileTokens';
import { welcomeTokens as w } from '../../../design-system/welcomeTokens';
import { tokens as t } from '../../../design-system/tokens';
import { BrandMark } from '../welcome/BrandMark';
import { brandPaths } from '../welcome/brandPaths';
import { referralPaths } from './referralPaths';
export function ReferralIcon({ name, selected = false }: { name: string; selected?: boolean }) {
  if (name === 'instagram')
    return (
      <LinearGradient
        colors={w.brands.instagram}
        style={{ width: p.icon.size, height: p.icon.size, borderRadius: p.icon.radius }}>
        <BrandMark brand="instagram" />
      </LinearGradient>
    );
  if (name === 'youtube')
    return (
      <Svg accessible={false} width={p.icon.size} height={p.icon.size} viewBox="0 0 24 24">
        <Rect x={4} y={6} width={16} height={12} fill={t.text.onAccent} />
        <Path d={brandPaths.youtube} fill={w.brands.youtube} />
      </Svg>
    );
  if (name === 'tiktok')
    return (
      <Svg accessible={false} width={p.icon.size} height={p.icon.size} viewBox="-2 -2 28 28">
        <Path d={brandPaths.tiktok} fill={w.brands.cyan} transform="translate(-0.7 0.7)" />
        <Path d={brandPaths.tiktok} fill={w.brands.pink} transform="translate(0.7 -0.4)" />
        <Path d={brandPaths.tiktok} fill={w.brands.tiktok} />
      </Svg>
    );
  const icon = referralPaths[name === 'appStore' ? 'app-store-ios' : name === 'friend' ? 'user-group' : 'comment-dots'];
  return (
    <View style={{ width: p.icon.size, height: p.icon.size }}>
      <Svg accessible={false} width={p.icon.size} height={p.icon.size} viewBox={icon.viewBox}>
        {name === 'appStore' ? <Rect x={48} y={80} width={352} height={352} fill={t.text.onAccent} /> : null}
        <Path
          d={icon.path}
          fill={
            name === 'appStore'
              ? p.colors.appStoreBottom
              : selected
                ? t.text.onAccent
                : name === 'friend'
                  ? t.brand.primary
                  : p.colors.muted
          }
        />
      </Svg>
    </View>
  );
}
