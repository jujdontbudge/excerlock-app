import Svg, { G, Path } from 'react-native-svg';
import { welcomeTokens as w } from '../../../design-system/welcomeTokens';
import { brandPaths } from './brandPaths';
export type Brand = keyof typeof brandPaths;
/** Library geometry; app-tile background and motion are separate components. */
export function BrandMark({ brand }: { brand: Brand }) {
  const path = brandPaths[brand];
  return (
    <Svg width="100%" height="100%" viewBox="0 0 80 80" accessible={false}>
      <G transform="translate(13 13) scale(2.25)">
        {brand === 'tiktok' ? (
          <>
            <Path d={path} fill={w.brands.cyan} transform="translate(-0.7 0.7)" />
            <Path d={path} fill={w.brands.pink} transform="translate(0.7 -0.4)" />
          </>
        ) : null}
        <Path d={path} fill={brand === 'youtube' ? w.brands.youtube : w.brands.white} />
      </G>
    </Svg>
  );
}
