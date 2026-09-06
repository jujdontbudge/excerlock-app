import type { ReactNode, Ref } from 'react';
import { StyleSheet, Text, View, type Text as NativeText } from 'react-native';

import { ChevronIcon } from './ChevronIcon';
import { isQuestionTitle } from './navigationTitle';
import { PressableScale } from './PressableScale';
import { colors, iconSize, layout, space, type } from './tokens';

export interface AppHeaderProps {
  accessibilityRole?: 'header';
  onBack?: () => void;
  question?: boolean;
  rightAction?: ReactNode;
  title?: string;
  titleRef?: Ref<NativeText>;
}

/**
 * The single navigation-header geometry used by routes, feature scaffolds,
 * full-screen decisions, and modal pages.
 */
export function AppHeader({
  accessibilityRole = 'header',
  onBack,
  question,
  rightAction,
  title,
  titleRef,
}: AppHeaderProps) {
  const usesQuestionLayout = question ?? isQuestionTitle(title);
  const back = onBack ? <BackAction onPress={onBack} /> : <HeaderSpacer />;
  const right = rightAction ?? <HeaderSpacer />;

  if (usesQuestionLayout) {
    return (
      <View style={styles.questionHeader}>
        <View style={styles.actionRow}>{back}{right}</View>
        {title ? (
          <Text accessibilityRole={accessibilityRole} ref={titleRef} style={styles.questionTitle}>
            {title}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.header}>
      {back}
      {title ? (
        <Text accessibilityRole={accessibilityRole} numberOfLines={1} ref={titleRef} style={styles.title}>
          {title}
        </Text>
      ) : <View style={styles.titleSlot} />}
      {right}
    </View>
  );
}

export function HeaderAction({ children, label, onPress }: { children?: ReactNode; label: string; onPress: () => void }) {
  return (
    <PressableScale accessibilityLabel={label} accessibilityRole="button" onPress={onPress} pressedScale={0.97}>
      <View style={styles.action}>{children ?? <Text style={styles.actionLabel}>{label}</Text>}</View>
    </PressableScale>
  );
}

export function HeaderBackButton({ onPress }: { onPress: () => void }) {
  return (
    <HeaderAction label="Back" onPress={onPress}>
      <ChevronIcon direction="left" size={iconSize.compact} />
    </HeaderAction>
  );
}

const BackAction = HeaderBackButton;

function HeaderSpacer() {
  return <View style={styles.action} />;
}

const styles = StyleSheet.create({
  action: {
    alignItems: 'center',
    height: layout.minimumTarget,
    justifyContent: 'center',
    minWidth: layout.minimumTarget,
    paddingHorizontal: space[2],
  },
  actionLabel: { ...type.button, color: colors.text.primary },
  actionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: layout.minimumTarget,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: layout.headerHeight,
  },
  questionHeader: { gap: space[2], marginBottom: space[4] },
  questionTitle: { ...type.screenTitle, color: colors.text.primary, textAlign: 'left' },
  title: { ...type.navigationTitle, color: colors.text.primary, flex: 1, textAlign: 'center' },
  titleSlot: { flex: 1 },
});
