import { Image } from 'react-native';
import { tokens as t } from '../../../design-system/tokens';

/** Canonical single-color ExcerLock silhouette, optically matched to the loop glyphs. */
export function LoopBrandMark() {
  return (
    <Image
      source={require('../../../../assets/running-lock-primary.png')}
      accessible={false}
      style={{ width: t.space.xxl, height: t.space.xxl }}
    />
  );
}
