import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Rect } from 'react-native-svg';
import { illustrationTokens as art } from '../../../ui/illustrationTokens';
import { tokens as t } from '../../../ui/tokens';
import { BrandMark } from '../../BrandMark';
import { brandPaths } from '../welcome/brandPaths';
import { referralPaths } from './referralPaths';
export function ReferralIcon({ name, selected = false }: { name: string; selected?: boolean }) {
  if (name === 'instagram')
    return (
      <LinearGradient
        colors={art.welcome.brands.instagram}
        style={{ width: art.referral.size, height: art.referral.size, borderRadius: art.referral.radius }}>
        <BrandMark brand="instagram" />
      </LinearGradient>
    );
  if (name === 'youtube')
    return (
      <Svg accessible={false} width={art.referral.size} height={art.referral.size} viewBox="0 0 24 24">
        <Rect x={4} y={6} width={16} height={12} fill={t.text.onAccent} />
        <Path d={brandPaths.youtube} fill={art.welcome.brands.youtube} />
      </Svg>
    );
  if (name === 'tiktok')
    return (
      <Svg accessible={false} width={art.referral.size} height={art.referral.size} viewBox="-2 -2 28 28">
        <Path d={brandPaths.tiktok} fill={art.welcome.brands.cyan} transform="translate(-0.7 0.7)" />
        <Path d={brandPaths.tiktok} fill={art.welcome.brands.pink} transform="translate(0.7 -0.4)" />
        <Path d={brandPaths.tiktok} fill={art.welcome.brands.tiktok} />
      </Svg>
    );
  const icon = referralPaths[name === 'appStore' ? 'app-store-ios' : name === 'friend' ? 'user-group' : 'comment-dots'];
  return (
    <View style={{ width: art.referral.size, height: art.referral.size }}>
      <Svg accessible={false} width={art.referral.size} height={art.referral.size} viewBox={icon.viewBox}>
        {name === 'appStore' ? <Rect x={48} y={80} width={352} height={352} fill={t.text.onAccent} /> : null}
        <Path
          d={icon.path}
          fill={
            name === 'appStore'
              ? art.referral.appStoreBottom
              : selected
                ? t.text.onAccent
                : name === 'friend'
                  ? t.brand.primary
                  : art.referral.muted
          }
        />
      </Svg>
    </View>
  );
}
