import { useState } from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Label } from '../../design-system/Label';
import { LockShackle } from '../../design-system/LockShackle';
import { tokens as t } from '../../design-system/tokens';
import { welcomeTokens as w } from '../../design-system/welcomeTokens';

/** The full-width lock owns status; condition cards own progress and actions. */
export function HomeLockStatus({ unlocked, subtitle }: { unlocked: boolean; subtitle: string }) {
  const [width, setWidth] = useState(0);
  return (
    <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)} style={{ width: '68.25%', alignSelf: 'center', paddingTop: unlocked ? 8 : 0 }}>
      <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
        style={unlocked ? { transform: [{ translateX: 12 }, { rotate: '-18deg' }], marginBottom: 6 } : undefined}>
        <LockShackle bodyWidth={width} />
      </View>
      {/* Solid brand orange, the same colour as the Screen Time shield lock. */}
      <LinearGradient colors={[t.brand.primary, t.brand.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ borderRadius: width * 0.15, minHeight: width * 0.83, padding: t.space.md,
          alignItems: 'center', justifyContent: 'space-between', gap: t.space.sm, boxShadow: w.card.shadow }}>
        <View style={{ minHeight: 40, width: '100%', justifyContent: 'center' }}>
          <Label variant="section" tone="onAccent" accessibilityRole="header" style={{ textAlign: 'center' }}>
            {unlocked ? 'Unlocked' : 'Locked'}
          </Label>
        </View>
        <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
          style={{ alignItems: 'center', paddingVertical: t.space.xs }}>
          <View style={{ width: 29, height: 29, borderRadius: 15, backgroundColor: t.text.onAccent }} />
          <View style={{ width: 14, height: 26, borderRadius: 5, marginTop: -5, backgroundColor: t.text.onAccent }} />
        </View>
        <View style={{ minHeight: 40, width: '100%', justifyContent: 'center' }}>
          <Label variant="label" tone="onAccent" style={{ textAlign: 'center' }}>{subtitle}</Label>
        </View>
      </LinearGradient>
    </View>
  );
}
