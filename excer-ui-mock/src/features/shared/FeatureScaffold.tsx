import type { PropsWithChildren, ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ScrollView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/design-system/PressableScale';
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
          paddingBottom: footer ? space[5] : Math.max(insets.bottom, space[5]),
          paddingTop: Math.max(insets.top, space[4]),
        },
      ]}
    >
      {onBack || title || rightAction ? (
        <View style={styles.navigationRow}>
          {onBack ? (
            <PressableScale accessibilityLabel="Back" accessibilityRole="button" onPress={onBack}>
              <View style={[styles.iconButton, tone === 'light' && styles.iconButtonLight]}>
                <Text style={[styles.iconButtonText, tone === 'light' && styles.inkText]}>‹</Text>
              </View>
            </PressableScale>
          ) : <View style={styles.navSpacer} />}
          {title ? <Text numberOfLines={1} style={[styles.navTitle, tone === 'light' && styles.inkText]}>{title}</Text> : <View style={styles.navTitleSlot} />}
          {rightAction ?? <View style={styles.navSpacer} />}
        </View>
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
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {content}
        </ScrollView>
      ) : content}
      {footer ? (
        <View
          style={[
            styles.footer,
            tone === 'light' && styles.footerLight,
            { paddingBottom: Math.max(insets.bottom, space[3]) },
          ]}
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
  return (
    <PressableScale
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      disabled={disabled || !onPress}
      onPress={onPress}
    >
      <View style={[styles.action, styles[`action_${variant}`], disabled && styles.disabled]}>
        <Text style={[
          styles.actionLabel,
          variant === 'screen' && styles.actionLabelInk,
          tone === 'light' && variant === 'text' && styles.inkText,
        ]}>{label}</Text>
      </View>
    </PressableScale>
  );
}

export function PrototypeNotice({ children, tone = 'dark' }: PropsWithChildren<{ tone?: 'dark' | 'light' }>) {
  return (
    <View style={[styles.notice, tone === 'light' && styles.noticeLight]}>
      <Text style={styles.noticeEyebrow}>PROTOTYPE PREVIEW</Text>
      <Text style={[styles.noticeText, tone === 'light' && styles.inkSecondary]}>{children}</Text>
    </View>
  );
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

export function OptionRow({ disabled = false, label, onPress, selected, subtitle, tone = 'dark', trailing }: OptionRowProps) {
  return (
    <PressableScale
      accessibilityLabel={`${label}${selected ? ', selected' : ''}`}
      accessibilityRole="button"
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
    >
      <View style={[styles.option, tone === 'light' && styles.optionLight, selected && styles.optionSelected, disabled && styles.disabled]}>
        <View style={styles.optionCopy}>
          <Text style={[styles.optionTitle, tone === 'light' && styles.inkText, selected && styles.optionTitleSelected]}>{label}</Text>
          {subtitle ? <Text style={[styles.optionSubtitle, tone === 'light' && styles.inkSecondary, selected && styles.optionSubtitleSelected]}>{subtitle}</Text> : null}
        </View>
        <Text style={[styles.optionTrailing, tone === 'light' && styles.inkSecondary, selected && styles.optionTitleSelected]}>
          {trailing ?? (selected ? '✓' : '›')}
        </Text>
      </View>
    </PressableScale>
  );
}

export function SectionHeading({ children }: PropsWithChildren) {
  return <Text style={styles.sectionHeading}>{children}</Text>;
}

const styles = StyleSheet.create({
  action: {
    alignItems: 'center',
    borderRadius: radius.pill,
    justifyContent: 'center',
    minHeight: 50,
    paddingHorizontal: space[6],
  },
  actionLabel: { ...type.button, color: colors.text.primary },
  actionLabelInk: { color: colors.text.ink },
  action_danger: { backgroundColor: colors.semantic.dangerAction },
  action_dark: { backgroundColor: colors.surface.cardStrong },
  action_screen: { backgroundColor: colors.surface.light },
  action_secondary: { backgroundColor: colors.surface.cardElevated },
  action_text: { backgroundColor: 'transparent' },
  content: {
    alignSelf: 'center',
    flexGrow: 1,
    maxWidth: layout.maxContentWidth,
    paddingHorizontal: layout.screenPadding,
    width: '100%',
  },
  disabled: { opacity: 0.38 },
  footer: {
    backgroundColor: 'rgba(26,15,6,0.18)',
    gap: space[2],
    paddingHorizontal: layout.screenPadding,
    paddingTop: space[3],
  },
  footerLight: { backgroundColor: colors.surface.ivoryBlur },
  iconButton: {
    alignItems: 'center',
    backgroundColor: colors.surface.card,
    borderRadius: radius.pill,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  iconButtonText: { ...type.screenTitle, color: colors.text.primary, lineHeight: 34 },
  iconButtonLight: { backgroundColor: colors.surface.ivoryBlur },
  inkSecondary: { color: colors.text.ink, opacity: 0.68 },
  inkText: { color: colors.text.ink },
  navSpacer: { height: 44, width: 44 },
  navTitle: { ...type.cardTitle, color: colors.text.primary, flex: 1, textAlign: 'center' },
  navTitleSlot: { flex: 1 },
  navigationRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: space[4],
    minHeight: 44,
  },
  notice: {
    backgroundColor: colors.surface.card,
    borderRadius: radius.card,
    gap: space[1],
    padding: space[4],
  },
  noticeEyebrow: { ...type.micro, color: colors.brand.signatureAmber },
  noticeText: { ...type.caption, color: colors.text.secondary },
  noticeLight: { backgroundColor: colors.surface.ivoryBlur },
  option: {
    alignItems: 'center',
    backgroundColor: colors.surface.card,
    borderRadius: radius.card,
    flexDirection: 'row',
    gap: space[3],
    minHeight: 64,
    paddingHorizontal: space[4],
    paddingVertical: space[3],
  },
  optionCopy: { flex: 1, gap: space[1] },
  optionSelected: { backgroundColor: colors.brand.primary },
  optionLight: { backgroundColor: colors.surface.ivoryBlur },
  optionSubtitle: { ...type.caption, color: colors.text.secondary },
  optionSubtitleSelected: { color: colors.text.ink, opacity: 0.72 },
  optionTitle: { ...type.cardTitle, color: colors.text.primary },
  optionTitleSelected: { color: colors.text.ink },
  optionTrailing: { ...type.cardTitle, color: colors.text.secondary },
  screen: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  sectionHeading: { ...type.sectionTitle, color: colors.text.primary },
});
