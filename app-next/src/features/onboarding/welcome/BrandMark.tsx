import Svg, { G, Path } from 'react-native-svg';
import { illustrationTokens as art } from '../../../design-system/illustrationTokens';
import { brandPaths } from './brandPaths';
export type Brand = keyof typeof brandPaths;
/** Library geometry; app-tile background and motion are separate components. */
export function BrandMark({ brand, color, outline }: { brand: Brand; color?: string; outline?: string }) {
  const path = brandPaths[brand];
  return (
    <Svg width="100%" height="100%" viewBox="0 0 80 80" accessible={false}>
      <G transform="translate(13 13) scale(2.25)">
        {brand === 'tiktok' ? (
          <>
            <Path d={path} fill={art.welcome.brands.cyan} transform="translate(-0.7 0.7)" />
            <Path d={path} fill={art.welcome.brands.pink} transform="translate(0.7 -0.4)" />
          </>
        ) : null}
        <Path
          d={path}
          fill={color ?? (brand === 'youtube' ? art.welcome.brands.youtube : art.welcome.brands.white)}
          stroke={outline}
          strokeWidth={outline ? 0.9 : undefined}
        />
      </G>
    </Svg>
  );
}
