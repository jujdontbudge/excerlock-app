import { Text, View } from 'react-native';
import { Icon } from '../../icons/Icon';
import { Label } from '../../design-system/Label';
import { tokens as t } from '../../design-system/tokens';

export function PlanTrialPreview({ condition }: { condition: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'space-between', gap: t.space.xl }}>
      <Label accessibilityRole="header" variant="question" style={{ textAlign: 'center', maxWidth: 330 }}>
        We want you to try ExcerLock Premium for free
      </Label>
      <View
        accessible
        accessibilityLabel="ExcerLock phone preview"
        style={{
          width: 210,
          height: 418,
          borderRadius: 40,
          borderWidth: 4,
          borderColor: t.text.primary,
          backgroundColor: t.text.primary,
          padding: 4,
        }}>
        <View style={{ position: 'absolute', left: -7, top: 92, width: 3, height: 34,
          borderRadius: 2, backgroundColor: t.text.primary }} />
        <View style={{ position: 'absolute', left: -7, top: 138, width: 3, height: 54,
          borderRadius: 2, backgroundColor: t.text.primary }} />
        <View style={{ position: 'absolute', right: -7, top: 122, width: 3, height: 68,
          borderRadius: 2, backgroundColor: t.text.primary }} />
        <View style={{ flex: 1, overflow: 'hidden', borderRadius: 34, backgroundColor: t.surface.canvas }}> 
          <View style={{ height: 42, justifyContent: 'center', paddingHorizontal: 16 }}>
            <Label variant="badge" style={{ width: 'auto', alignSelf: 'flex-start' }}>9:41</Label>
            <View style={{ position: 'absolute', top: 8, alignSelf: 'center', width: 76, height: 24,
              borderRadius: t.radius.pill, backgroundColor: t.text.primary }} />
          </View>
          <View style={{ paddingHorizontal: 16, gap: 4 }}>
            <Label variant="section">ExcerLock</Label>
            <Label variant="support">Your movement plan</Label>
          </View>
          <View style={{ flex: 1, justifyContent: 'center', padding: 16 }}>
            <View style={{ borderWidth: 1, borderColor: t.border.outline, borderRadius: t.radius.card,
              backgroundColor: t.surface.solid, padding: 18, alignItems: 'center', gap: 14 }}>
              <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: t.brand.primary,
                alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="lock" size={28} variant="utility" tint={t.text.onAccent} />
              </View>
              <Label variant="section">Apps are blocked</Label>
              <Label variant="support">{condition}</Label>
              <View style={{ width: '100%', height: 8, borderRadius: t.radius.pill,
                backgroundColor: t.border.divider, overflow: 'hidden' }}>
                <View style={{ width: '38%', height: '100%', borderRadius: t.radius.pill,
                  backgroundColor: t.brand.primary }} />
              </View>
            </View>
          </View>
          <View style={{ height: 54, borderTopWidth: 1, borderTopColor: t.border.divider,
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' }}>
            {['Home', 'Conditions', 'Stats', 'Settings'].map((item, index) => (
              <Text key={item} maxFontSizeMultiplier={1} style={{ flex: 1, fontSize: 7, fontFamily: t.font.bold,
                textAlign: 'center', color: index === 1 ? t.brand.primary : t.text.secondary }}>
                {item}
              </Text>
            ))}
          </View>
          <View style={{ height: 16, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: 72, height: 4, borderRadius: 2, backgroundColor: t.text.primary }} />
          </View>
        </View>
      </View>
    </View>
  );
}
