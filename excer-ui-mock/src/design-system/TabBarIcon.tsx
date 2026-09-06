import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { assetRegistry } from '@/content';

import { VectorIcon } from './VectorIcon';
import { iconSize } from './tokens';

export type TabBarIconName = 'home' | 'manage' | 'analysis' | 'settings';

export interface TabBarIconProps {
  color: string;
  name: TabBarIconName;
  opacity?: number;
  size?: number;
  testID?: string;
}

const sources = {
  analysis: assetRegistry.glyphs['icon-tab-chart'],
  home: assetRegistry.glyphs['icon-tab-home'],
  manage: assetRegistry.glyphs['icon-tab-manage'],
  settings: assetRegistry.glyphs['icon-tab-settings'],
} as const;

export const TabBarIcon = memo(function TabBarIcon({
  color: _color,
  name,
  opacity = 1,
  size = iconSize.action,
  testID,
}: TabBarIconProps) {
  return (
    <View style={[styles.host, { height: size, opacity, width: size }]} testID={testID}>
      <VectorIcon source={sources[name]} />
    </View>
  );
});

const styles = StyleSheet.create({
  host: { alignItems: 'center', justifyContent: 'center' },
});
