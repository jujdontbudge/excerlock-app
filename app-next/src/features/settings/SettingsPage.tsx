import { PropsWithChildren, ReactNode } from 'react';
import { View } from 'react-native';
import { ScreenShell, PressableScale, Label } from '../../design-system';
import { settingsCopy as c } from '../../content/settings';
import { tokens as t } from '../../design-system/tokens';
import { Reveal } from '../../motion/Reveal';
export function SettingsPage({
  children,
  onBack,
  overlay,
  footer,
  scrollToEndOnKeyboard,
}: PropsWithChildren<{
  onBack: () => void;
  overlay?: ReactNode;
  footer?: ReactNode;
  scrollToEndOnKeyboard?: boolean;
}>) {
  return (
    <ScreenShell
      scrollToEndOnKeyboard={scrollToEndOnKeyboard}
      header={
        <View style={{ paddingHorizontal: t.layout.page, paddingVertical: t.space.sm }}>
          <PressableScale label={c.back} onPress={onBack}>
            <Label>{c.back}</Label>
          </PressableScale>
        </View>
      }
      overlay={overlay}
      footer={footer}>
      <Reveal style={{ gap: t.space.xl }}>{children}</Reveal>
    </ScreenShell>
  );
}
