import { PropsWithChildren, ReactNode } from 'react';
import { View } from 'react-native';
import { ScreenShell, BackButton } from '.';
import { tokens as t } from './tokens';
import { Reveal } from './Reveal';
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
        <View style={{ paddingHorizontal: t.layout.page - (t.control.inline - t.icon.md) / 2 }}>
          <BackButton onPress={onBack} />
        </View>
      }
      overlay={overlay}
      footer={footer}>
      <Reveal style={{ gap: t.space.xl }}>{children}</Reveal>
    </ScreenShell>
  );
}
