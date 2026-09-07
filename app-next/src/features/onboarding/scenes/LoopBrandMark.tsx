import Svg, { Defs, FeColorMatrix, Filter, Image } from 'react-native-svg';
import { tokens as t } from '../../../design-system/tokens';
/** Display the existing orange brand artwork with its near-white matte keyed out at render time. */
export function LoopBrandMark() {
  return (
    <Svg width={t.space.xxl} height={t.space.xxl} viewBox="0 0 100 100" accessible={false}>
      <Defs>
        <Filter id="loop-brand-alpha" x="0%" y="0%" width="100%" height="100%">
          <FeColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 -2 0 0 1.9" />
        </Filter>
      </Defs>
      <Image
        href={require('../../../../assets/running-lock.png')}
        width="100"
        height="100"
        filter="url(#loop-brand-alpha)"
      />
    </Svg>
  );
}
