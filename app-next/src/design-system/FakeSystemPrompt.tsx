import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { tokens as t } from './tokens';
import { Label } from './Label';
import { PressableScale } from './PressableScale';
import { controls } from '../content/controls';
import { useMotion } from '../motion/useMotion';
import { fadeIn, fadeOut, popIn } from '../motion/presets';
export function FakeSystemPrompt({
  title,
  body,
  onResolve,
}: {
  title: string;
  body: string;
  onResolve: (granted: boolean) => void;
}) {
  const m = useMotion();
  return (
    <Animated.View
      accessibilityViewIsModal
      entering={fadeIn}
      exiting={fadeOut}
      style={[
        StyleSheet.absoluteFill,
        {
          zIndex: 100,
          backgroundColor: t.surface.scrim,
          alignItems: 'center',
          justifyContent: 'center',
          padding: t.space.xl,
        },
      ]}>
      <Animated.View
        entering={popIn(m.reduced)}
        exiting={fadeOut}
        style={{
          width: '100%',
          maxWidth: t.layout.prompt,
          backgroundColor: t.surface.card,
          borderRadius: t.radius.card,
          overflow: 'hidden',
        }}>
        <View style={{ padding: t.space.xl, gap: t.space.sm }}>
          <Label accessibilityRole="header" variant="label" style={{ textAlign: 'center' }}>
            {title}
          </Label>
          <Label variant="support" style={{ textAlign: 'center' }}>
            {body}
          </Label>
        </View>
        <View
          style={{
            borderTopWidth: t.stroke.hairline,
            borderColor: t.border.divider,
          }}>
          {[false, true].map((granted) => (
            <PressableScale
              key={String(granted)}
              label={granted ? controls.allow : controls.deny}
              onPress={() => onResolve(granted)}
              style={{
                padding: t.space.md,
                minHeight: t.control.inline,
                alignItems: 'center',
                borderTopWidth: granted ? t.stroke.hairline : 0,
                borderColor: t.border.divider,
              }}>
              <Label variant="label" style={{ color: t.text.primary }}>
                {granted ? controls.allow : controls.deny}
              </Label>
            </PressableScale>
          ))}
        </View>
      </Animated.View>
    </Animated.View>
  );
}
