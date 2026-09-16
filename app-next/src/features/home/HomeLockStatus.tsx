import { useState } from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Label } from '../../design-system/Label';
import { LockShackle } from '../../design-system/LockShackle';
import { tokens as t } from '../../design-system/tokens';
import { welcomeTokens as w } from '../../design-system/welcomeTokens';
import { homeCopy as c } from '../../content/home';

/** The full-width lock owns status; condition cards own progress and actions. */
export function HomeLockStatus({ unlocked }: { unlocked: boolean }) {
  const [width, setWidth] = useState(0);
  return (
    <View style={{ gap: t.space.lg }}>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={unlocked ? 'Unlocked' : 'Locked'}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        style={{ width: '58%', alignSelf: 'center', paddingTop: unlocked ? 8 : 0 }}>
        <View style={unlocked ? { transform: [{ translateX: 12 }, { rotate: '-18deg' }], marginBottom: 6 } : undefined}>
          <LockShackle bodyWidth={width} />
        </View>
        {/* Solid brand orange, the same colour as the Screen Time shield lock; keyhole only. */}
        <LinearGradient colors={[t.brand.primary, t.brand.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ borderRadius: width * 0.15, minHeight: width * 0.83, padding: t.space.md,
            alignItems: 'center', justifyContent: 'center', boxShadow: w.card.shadow }}>
          <View style={{ alignItems: 'center' }}>
            <View style={{ width: 29, height: 29, borderRadius: 15, backgroundColor: t.text.onAccent }} />
            <View style={{ width: 14, height: 26, borderRadius: 5, marginTop: -5, backgroundColor: t.text.onAccent }} />
          </View>
        </LinearGradient>
      </View>
      <Label
        variant="section"
        accessibilityRole="header"
        style={{ textAlign: 'center', paddingHorizontal: t.space.lg }}>
        {c.lockCaption}
      </Label>
    </View>
  );
}
