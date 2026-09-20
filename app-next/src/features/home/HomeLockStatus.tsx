import { useState } from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Label } from '../../design-system/Label';
import { tokens as t } from '../../design-system/tokens';
import { homeCopy as c } from '../../content/home';

/** A centered, rounded lock inspired by the product mark without illustrated effects. */
export function HomeLockStatus({ unlocked }: { unlocked: boolean }) {
  const [width, setWidth] = useState(0);
  const stroke = width * 0.11;
  return (
    <View style={{ alignItems: 'center', gap: t.space.lg }}>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={unlocked ? 'Unlocked' : 'Locked'}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        style={{ width: '58%', alignSelf: 'center', alignItems: 'center', paddingTop: t.space.sm }}>
        <View style={{
          width: width * 0.62,
          height: width * 0.48,
          borderWidth: stroke,
          borderBottomWidth: 0,
          borderColor: t.brand.decorative,
          borderTopLeftRadius: width * 0.31,
          borderTopRightRadius: width * 0.31,
          marginBottom: -width * 0.14,
        }} />
        <LinearGradient
          colors={[t.brand.decorative, t.brand.primary]}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.85, y: 1 }}
          style={{
            width: '100%',
            height: width * 0.72,
            borderRadius: width * 0.16,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <View style={{ alignItems: 'center' }}>
            <View style={{ width: width * 0.13, height: width * 0.13,
              borderRadius: t.radius.pill, backgroundColor: t.text.onAccent }} />
            <View style={{ width: width * 0.065, height: width * 0.13,
              borderRadius: t.radius.field, marginTop: -width * 0.025,
              backgroundColor: t.text.onAccent }} />
          </View>
        </LinearGradient>
      </View>
      <Label variant="section" accessibilityRole="header"
        style={{ textAlign: 'center', paddingHorizontal: t.space.lg }}>
        {c.lockCaption}
      </Label>
    </View>
  );
}
