import type { PropsWithChildren } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { gradients, layout } from './tokens';

export type GradientScreenVariant = 'home' | 'content' | 'detail' | 'night' | 'ivory';

export interface GradientScreenProps extends PropsWithChildren {
  /** Removes the default 20pt page inset for edge-to-edge compositions. */
  edgeToEdge?: boolean;
  /** Safe-area edges claimed by the content layer. */
  edges?: readonly Edge[];
  style?: StyleProp<ViewStyle>;
  testID?: string;
  variant?: GradientScreenVariant;
}

export function GradientScreen({
  children,
  edgeToEdge = false,
  edges = ['top', 'right', 'bottom', 'left'],
  style,
  testID,
  variant = 'content',
}: GradientScreenProps) {
  const recipe = variant === 'home' ? gradients.homeHeat : gradients[variant];

  return (
    <LinearGradient
      colors={recipe.colors}
      locations={recipe.locations}
      style={styles.gradient}
      testID={testID}
    >
      <SafeAreaView edges={edges} style={styles.safeArea}>
        <View style={[styles.content, edgeToEdge && styles.edgeToEdge, style]}>{children}</View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  content: {
    alignSelf: 'center',
    flex: 1,
    maxWidth: layout.maxContentWidth,
    paddingHorizontal: layout.screenPadding,
    width: '100%',
  },
  edgeToEdge: { maxWidth: undefined, paddingHorizontal: 0 },
  gradient: { flex: 1 },
  safeArea: { flex: 1 },
});
