import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { assetRegistry } from '@/content/assets';

import { VectorIcon } from './VectorIcon';
import { iconSize } from './tokens';

export interface ChevronIconProps {
  direction?: 'left' | 'right';
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export function ChevronIcon({ direction = 'right', size = iconSize.inline, style }: ChevronIconProps) {
  return (
    <View
      accessibilityElementsHidden
      pointerEvents="none"
      style={[styles.host, { height: size, width: size }, direction === 'left' && styles.left, style]}
    >
      <VectorIcon source={assetRegistry.glyphs['icon-arrow-right']} />
    </View>
  );
}

const styles = StyleSheet.create({
  host: { alignItems: 'center', justifyContent: 'center' },
  left: { transform: [{ rotate: '180deg' }] },
});
