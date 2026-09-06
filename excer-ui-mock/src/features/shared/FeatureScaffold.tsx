import type { PropsWithChildren, ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ScrollView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader } from '@/design-system/AppHeader';
import { ChevronIcon } from '@/design-system/ChevronIcon';
import { PillButton, type PillButtonVariant } from '@/design-system/PillButton';
import { PressableScale } from '@/design-system/PressableScale';
import { SelectableBubble } from '@/design-system/SelectableBubble';
import { colors, gradients, layout, radius, space, type } from '@/design-system/tokens';

export type CanvasVariant = 'heat' | 'content' | 'detail' | 'night' | 'ivory';

const canvas = {
  heat: gradients.homeHeat,
  content: gradients.content,
  detail: gradients.detail,
  night: gradients.night,
  ivory: gradients.ivory,
} as const;

export type FeatureScaffoldProps = PropsWithChildren<{
  accessibilityLabel?: string;
  canvasVariant?: CanvasVariant;
  footer?: ReactNode;
  dockOverlay?: boolean;
  floatingFooter?: boolean;
  onBack?: () => void;
  rightAction?: ReactNode;
  scroll?: boolean;
  title?: string;
  tone?: 'dark' | 'light';
}>;

export function FeatureScaffold({
  accessibilityLabel,
  canvasVariant = 'content',
  children,
  footer,
  dockOverlay = false,
  floatingFooter = false,
  onBack,
  rightAction,
  scroll = true,
  title,
  tone = 'dark',
}: FeatureScaffoldProps) {
  const insets = useSafeAreaInsets();
  const content = (
    <View
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.content,
        {
          paddingBottom: dockOverlay || floatingFooter ? 0 : footer ? space[5] : Math.max(insets.bottom, space[5]),
          paddingTop: Math.max(insets.top, space[4]),
        },
      ]}
    >
      {onBack || title || rightAction ? (
        <AppHeader onBack={onBack} rightAction={rightAction} title={title} />
      ) : null}
      {children}
    </View>
  );

  return (
    <LinearGradient
      colors={canvas[canvasVariant].colors}
      locations={canvas[canvasVariant].locations}
      style={styles.screen}
    >
      {scroll ? (
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            floatingFooter && Boolean(footer) && styles.scrollContentWithFloatingFooter,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={styles.scroll}
          testID="feature-scaffold-scroll"
        >
          {content}
        </ScrollView>
      ) : content}
      {footer ? (
        <View
          pointerEvents={floatingFooter ? 'box-none' : 'auto'}
          style={[
            styles.footer,
            tone === 'light' && styles.footerLight,
            floatingFooter && styles.footerFloating,
            { paddingBottom: Math.max(insets.bottom, space[3]) },
          ]}
          testID="feature-scaffold-footer"
        >
          {footer}
        </View>
      ) : null}
    </LinearGradient>
  );
}

export type ScreenActionProps = {
  accessibilityLabel?: string;
  disabled?: boolean;
  label: string;
  onPress?: () => void;
  variant?: 'screen' | 'secondary' | 'dark' | 'text' | 'danger';
  tone?: 'dark' | 'light';
};

export function ScreenAction({
  accessibilityLabel,
  disabled,
  label,
  onPress,
  variant = 'screen',
  tone = 'dark',
}: ScreenActionProps) {
  const buttonVariant: PillButtonVariant = variant === 'danger' ? 'destructive' : variant;
  return <PillButton accessibilityLabel={accessibilityLabel} disabled={disabled} fullWidth label={label} onPress={onPress} variant={buttonVariant} />;
}

export function PrototypeNotice({ children, tone = 'dark' }: PropsWithChildren<{ tone?: 'dark' | 'light' }>) {
  return null;
}

export type OptionRowProps = {
  disabled?: boolean;
  label: string;
  onPress?: () => void;
  selected?: boolean;
  subtitle?: string;
  trailing?: string;
  tone?: 'dark' | 'light';
};

export function OptionRow({ disabled = false, label, onPress, selected, tone = 'dark', trailing }: OptionRowProps) {
  if (typeof selected === 'boolean') {
    return (
      <SelectableBubble
        disabled={disabled || !onPress}
        fullWidth
        label={label}
        onPress={onPress ?? (() => undefined)}
        selected={selected}
        trailing={trailing ? (
          <Text style={[styles.optionTrailing, selected && styles.optionTrailingSelected]}>{trailing}</Text>
        ) : undefined}
      />
    );
  }

  return (
    <PressableScale
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
    >
      <View style={[styles.option, tone === 'light' && styles.optionLight, disabled && styles.disabled]}>
        <View style={styles.optionCopy}>
          <Text style={[styles.optionTitle, tone === 'light' && styles.inkText]}>{label}</Text>
        </View>
        {trailing ? (
          <Text style={[styles.optionTrailing, tone === 'light' && styles.inkSecondary]}>{trailing}</Text>
        ) : <ChevronIcon />}
      </View>
    </PressableScale>
  );
}

export function SectionHeading({ children }: PropsWithChildren) {
  return <Text style={styles.sectionHeading}>{children}</Text>;
}

const styles = StyleSheet.create({
  content: {
    alignSelf: 'center',
    flexGrow: 1,
    maxWidth: layout.maxContentWidth,
    paddingHorizontal: layout.screenPadding,
    width: '100%',
  },
  disabled: { opacity: 0.38 },
  footer: {
    backgroundColor: 'transparent',
    gap: space[2],
    paddingHorizontal: layout.screenPadding,
    paddingTop: space[3],
  },
  footerFloating: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    zIndex: 10,
  },
  footerLight: { backgroundColor: 'transparent' },
  inkSecondary: { color: colors.text.ink },
  inkText: { color: colors.text.ink },
  notice: {
    backgroundColor: colors.surface.bubble,
    borderColor: colors.surface.bubbleBorder,
    borderRadius: radius.sheet,
    borderWidth: 1,
    gap: space[1],
    padding: space[4],
  },
  noticeEyebrow: { ...type.micro, color: colors.brand.signatureAmber },
  noticeText: { ...type.caption, color: colors.text.secondary },
  noticeLight: { backgroundColor: colors.surface.ivoryBlur },
  option: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderBottomColor: colors.surface.divider,
    borderBottomWidth: 1,
    borderRadius: 0,
    flexDirection: 'row',
    gap: space[3],
    minHeight: layout.rowHeight,
    paddingHorizontal: space[4],
    paddingVertical: space[3],
  },
  optionCopy: { flex: 1, gap: space[1] },
  optionSelected: { backgroundColor: colors.surface.bubbleStrong, borderColor: colors.surface.bubbleBorder, borderRadius: radius.sheet, borderStyle: 'solid', borderWidth: 1 },
  optionLight: { backgroundColor: colors.surface.ivoryBlur },
  optionSubtitle: { ...type.caption, color: colors.text.secondary },
  optionSubtitleSelected: { color: colors.text.secondary },
  optionTitle: { ...type.cardTitle, color: colors.text.primary },
  optionTitleSelected: { color: colors.text.primary },
  optionTrailing: { ...type.cardTitle, color: colors.text.primary },
  optionTrailingSelected: { color: colors.brand.primary },
  screen: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  scrollContentWithFloatingFooter: { paddingBottom: layout.floatingFooterContentInset },
  sectionHeading: { ...type.sectionTitle, color: colors.text.primary },
});
