import { ReactNode } from 'react';
import { View } from 'react-native';
import { ScreenShell, Label, CloseButton, Pictogram } from '../../design-system';
import { tokens as t } from '../../design-system/tokens';
import { unlockCopy as c } from '../../content/unlock';
import Animated from 'react-native-reanimated';
import { popIn } from '../../motion/presets';
import { useUnlockMotion } from './useUnlockMotion';
export function UnlockLayout({
  children,
  footer,
  close,
  preview,
}: {
  children: ReactNode;
  footer?: ReactNode;
  close: () => void;
  preview: boolean;
}) {
  return (
    <ScreenShell
      header={
        <View style={{ paddingHorizontal: t.layout.page, flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>{preview ? <Label>{c.preview}</Label> : null}</View>
          <CloseButton label={c.close} onPress={close} />
        </View>
      }
      footer={footer}
      contentStyle={{ paddingTop: 0 }}>
      <View style={{ gap: t.space.md }}>{children}</View>
    </ScreenShell>
  );
}
export function Detected({ title, body }: { title: string; body: string }) {
  const { reduced } = useUnlockMotion();
  return (
    <Animated.View
      entering={popIn(reduced)}
      style={{
        position: 'absolute',
        inset: 0,
        backgroundColor: t.surface.detected,
        justifyContent: 'center',
        padding: t.space.xl,
      }}>
      <View style={{ alignItems: 'center', marginBottom: t.space.lg }}>
        <Pictogram name="check" size="card" variant="utility" tone="onAccent" />
      </View>
      <Label accessibilityRole="header" variant="display" tone="onAccent" style={{ textAlign: 'center' }}>
        {title}
      </Label>
      <Label tone="onAccent" style={{ textAlign: 'center', marginTop: t.space.md }}>
        {body}
      </Label>
    </Animated.View>
  );
}
