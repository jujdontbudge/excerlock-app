import { PropsWithChildren, ReactNode } from 'react';
import { View } from 'react-native';
import { ScreenShell, BackButton } from '../../design-system';
import { profileTokens as p } from '../../design-system/profileTokens';
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
        <View style={{ paddingHorizontal: t.layout.page - (t.control.inline - p.header.arrow) / 2 }}>
          <BackButton onPress={onBack} />
        </View>
      }
      overlay={overlay}
      footer={footer}>
      <Reveal style={{ gap: t.space.xl }}>{children}</Reveal>
    </ScreenShell>
  );
}
