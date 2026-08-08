import type { ImageSourcePropType, StyleProp, ViewStyle } from 'react-native';
import { ActivityIndicator, ImageBackground, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useReducedMotion } from 'react-native-reanimated';

import { PressableScale } from './PressableScale';
import { colors, gradients, radius, space, type } from './tokens';

export interface EventConditionCardProps {
  actionLabel?: string;
  banner: ImageSourcePropType;
  onAction?: () => void;
  onInfo?: () => void;
  onOpen?: () => void;
  status: 'eligible' | 'completing' | 'completed' | 'failed';
  statusLabel?: string;
  style?: StyleProp<ViewStyle>;
  subtitle?: string;
  testID?: string;
  title: string;
  variant: 'event';
}

export interface StateConditionCardProps {
  actionLabel?: string;
  banner: ImageSourcePropType;
  onAction?: () => void;
  onInfo?: () => void;
  onOpen?: () => void;
  status: 'inactive' | 'verifying' | 'active' | 'ended';
  statusLabel?: string;
  style?: StyleProp<ViewStyle>;
  subtitle?: string;
  testID?: string;
  title: string;
  variant: 'state';
}

export interface RateConditionCardProps {
  banner: ImageSourcePropType;
  earnedValue: string;
  onInfo?: () => void;
  onOpen?: () => void;
  progress: number;
  ratioLabel: string;
  sourceValue: string;
  statusLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  title: string;
  variant: 'rate';
}

export type ConditionCardProps = EventConditionCardProps | StateConditionCardProps | RateConditionCardProps;

export function ConditionCard(props: ConditionCardProps) {
  if (props.variant === 'state') {
    return <StateConditionCard {...props} />;
  }
  if (props.variant === 'rate') {
    return <RateConditionCard {...props} />;
  }

  const { banner, onAction, onOpen, status, style, subtitle, testID, title } = props;
  const actionLabel = props.actionLabel ?? (status === 'failed' ? 'Try again' : 'Complete');
  const settled = status === 'completed';
  const loading = status === 'completing';

  return (
    <View
      accessibilityLabel={`${title}, ${status}`}
      style={[styles.shell, style]}
      testID={testID}
    >
      <ImageBackground accessibilityIgnoresInvertColors source={banner} style={styles.banner}>
        <LinearGradient
          colors={gradients.bannerScrim.colors}
          locations={gradients.bannerScrim.locations}
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.topRow}>
          <Text style={styles.status}>{props.statusLabel ?? eventStatusLabel(status)}</Text>
          {props.onInfo ? (
            <PressableScale
              accessibilityLabel={`About ${title}`}
              accessibilityRole="button"
              onPress={props.onInfo}
              pressedScale={0.96}
            >
              <View style={styles.infoButton}>
                <Text style={styles.infoText}>i</Text>
              </View>
            </PressableScale>
          ) : null}
        </View>
        <View style={styles.bottomRow}>
          <CardCopy onOpen={onOpen} subtitle={subtitle} title={title} />
          {settled ? (
            <View accessibilityLabel={`${title} completed`} style={styles.settledPill}>
              <Text style={styles.settledText}>✓ Completed</Text>
            </View>
          ) : (
            <PressableScale
              accessibilityLabel={`${actionLabel} ${title}`}
              accessibilityRole="button"
              disabled={loading || !onAction}
              disabledOpacity={loading ? 1 : 0.45}
              onPress={onAction}
              pressedScale={0.97}
            >
              <View style={styles.actionPill}>
                {loading ? <ActivityIndicator color={colors.text.ink} size="small" /> : <Text style={styles.actionText}>{actionLabel}</Text>}
              </View>
            </PressableScale>
          )}
        </View>
      </ImageBackground>
    </View>
  );
}

function RateConditionCard({
  banner,
  earnedValue,
  onInfo,
  onOpen,
  progress,
  ratioLabel,
  sourceValue,
  statusLabel,
  style,
  testID,
  title,
}: RateConditionCardProps) {
  const percentage = Math.round(Math.min(1, Math.max(0, progress)) * 100);

  return (
    <View
      accessibilityLabel={`${title}. ${sourceValue}. ${earnedValue}. ${ratioLabel}`}
      style={[styles.shell, style]}
      testID={testID}
    >
      <ImageBackground accessibilityIgnoresInvertColors source={banner} style={styles.banner}>
        <LinearGradient
          colors={gradients.bannerScrim.colors}
          locations={gradients.bannerScrim.locations}
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
        />
        {statusLabel || onInfo ? (
          <View style={styles.topRow}>
            {statusLabel ? <Text style={styles.status}>{statusLabel}</Text> : <View />}
            {onInfo ? (
              <PressableScale accessibilityLabel={`About ${title}`} accessibilityRole="button" onPress={onInfo}>
                <View style={styles.infoButton}><Text style={styles.infoText}>i</Text></View>
              </PressableScale>
            ) : null}
          </View>
        ) : null}
        <PressableScale
          accessibilityLabel={onOpen ? `Open ${title} details` : undefined}
          accessibilityRole={onOpen ? 'button' : undefined}
          disabled={!onOpen}
          disabledOpacity={1}
          onPress={onOpen}
          style={styles.rateContent}
        >
          <View>
            <Text numberOfLines={1} style={styles.rateTitle}>{title}</Text>
            <View style={styles.rateValues}>
              <Text numberOfLines={1} style={styles.rateSource}>{sourceValue}</Text>
              <Text numberOfLines={1} style={styles.rateEarned}>{earnedValue}</Text>
            </View>
            <Text numberOfLines={1} style={styles.rateRatio}>{ratioLabel}</Text>
            <View
              accessible
              accessibilityLabel={`${title} progress`}
              accessibilityRole="progressbar"
              accessibilityValue={{ min: 0, max: 100, now: percentage, text: `${sourceValue}, ${earnedValue}` }}
              style={styles.meterTrack}
            >
              <View style={[styles.meterFill, { width: `${percentage}%` }]} />
            </View>
          </View>
        </PressableScale>
      </ImageBackground>
    </View>
  );
}

function StateConditionCard({
  actionLabel,
  banner,
  onAction,
  onInfo,
  onOpen,
  status,
  statusLabel,
  style,
  subtitle,
  testID,
  title,
}: StateConditionCardProps) {
  const active = status === 'active';
  const statusCopy = stateStatusCopy(status);
  const resolvedActionLabel = actionLabel ?? (status === 'ended' ? 'Start again' : 'Start walking');

  return (
    <View accessibilityLabel={`${title}, ${status}`} style={[styles.shell, style]} testID={testID}>
      <ImageBackground accessibilityIgnoresInvertColors source={banner} style={styles.banner}>
        <LinearGradient
          colors={gradients.bannerScrim.colors}
          locations={gradients.bannerScrim.locations}
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.topRow}>
          <View style={styles.liveStatus}>
            <StatusDot active={active} status={status} />
            <Text style={styles.status}>{statusLabel ?? statusCopy.label}</Text>
          </View>
          {onInfo ? (
            <PressableScale accessibilityLabel={`About ${title}`} accessibilityRole="button" onPress={onInfo}>
              <View style={styles.infoButton}><Text style={styles.infoText}>i</Text></View>
            </PressableScale>
          ) : null}
        </View>
        <View style={styles.bottomRow}>
          <CardCopy onOpen={onOpen} subtitle={subtitle ?? statusCopy.subtitle} title={title} />
          {active ? (
            <View accessibilityLabel="Balance drains normally" style={styles.pausePill}>
              <Text style={styles.pauseIcon}>↘</Text>
              <Text numberOfLines={2} style={styles.pauseText}>Balance drains normally</Text>
            </View>
          ) : (status === 'inactive' || status === 'ended') && onAction ? (
            <PressableScale
              accessibilityLabel={`${resolvedActionLabel} for ${title}`}
              accessibilityRole="button"
              onPress={onAction}
              pressedScale={0.97}
            >
              <View style={styles.actionPill}><Text style={styles.actionText}>{resolvedActionLabel}</Text></View>
            </PressableScale>
          ) : null}
        </View>
      </ImageBackground>
    </View>
  );
}

function CardCopy({ onOpen, subtitle, title }: { onOpen?: () => void; subtitle?: string; title: string }) {
  const copy = (
    <View style={styles.copyInner}>
      <Text numberOfLines={1} style={styles.title}>{title}</Text>
      {subtitle ? <Text numberOfLines={2} style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
  if (!onOpen) return <View style={styles.copy}>{copy}</View>;
  return (
    <PressableScale accessibilityLabel={`Open ${title} details`} accessibilityRole="button" onPress={onOpen} style={styles.copy}>
      {copy}
    </PressableScale>
  );
}

const activePulse = {
  '0%': { opacity: 1, transform: [{ scale: 1 }] },
  '50%': { opacity: 0.45, transform: [{ scale: 0.72 }] },
  '100%': { opacity: 1, transform: [{ scale: 1 }] },
} as const;

function StatusDot({ active, status }: { active: boolean; status: StateConditionCardProps['status'] }) {
  const reduceMotion = useReducedMotion();
  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.statusDot,
        { backgroundColor: active ? colors.semantic.success : status === 'verifying' ? colors.semantic.attention : colors.text.tertiary },
        active && !reduceMotion
          ? {
              animationDuration: '1400ms',
              animationIterationCount: 'infinite',
              animationName: activePulse,
              animationTimingFunction: 'ease-in-out',
            }
          : null,
      ]}
    />
  );
}

function stateStatusCopy(status: StateConditionCardProps['status']) {
  switch (status) {
    case 'inactive':
      return { label: 'READY', subtitle: 'Walk to keep apps open' };
    case 'verifying':
      return { label: 'VERIFYING', subtitle: 'Checking your movement…' };
    case 'active':
      return { label: 'ACTIVE', subtitle: 'Apps unlocked while you keep moving' };
    case 'ended':
      return { label: 'ENDED', subtitle: 'You stopped walking' };
  }
}

function eventStatusLabel(status: EventConditionCardProps['status']) {
  switch (status) {
    case 'eligible':
      return 'READY TO EARN';
    case 'completing':
      return 'VERIFYING';
    case 'completed':
      return 'EARNED';
    case 'failed':
      return 'NEEDS ATTENTION';
  }
}

const styles = StyleSheet.create({
  actionPill: {
    alignItems: 'center',
    backgroundColor: colors.surface.light,
    borderRadius: radius.pill,
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 104,
    paddingHorizontal: space[4],
  },
  actionText: {
    ...type.label,
    color: colors.text.ink,
  },
  banner: {
    flex: 1,
    justifyContent: 'space-between',
  },
  bottomRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: space[3],
    justifyContent: 'space-between',
    padding: space[4],
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  copyInner: { flex: 1 },
  infoButton: {
    alignItems: 'center',
    backgroundColor: colors.surface.cardStrong,
    borderRadius: radius.pill,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  infoText: {
    ...type.bodyEmphasis,
    color: colors.text.primary,
  },
  liveStatus: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space[2],
  },
  meterFill: {
    backgroundColor: colors.semantic.earn,
    borderRadius: radius.pill,
    height: '100%',
  },
  meterTrack: {
    backgroundColor: colors.surface.trackDark,
    borderRadius: radius.pill,
    height: 10,
    overflow: 'hidden',
    width: '100%',
  },
  pauseIcon: {
    ...type.label,
    color: colors.text.primary,
  },
  pausePill: {
    alignItems: 'center',
    backgroundColor: colors.surface.cardStrong,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: space[2],
    maxWidth: 132,
    minHeight: 44,
    paddingHorizontal: space[3],
  },
  pauseText: {
    ...type.micro,
    color: colors.text.primary,
    flexShrink: 1,
  },
  rateContent: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: space[4],
  },
  rateEarned: {
    ...type.statValue,
    color: colors.text.primary,
  },
  rateRatio: {
    ...type.caption,
    color: colors.text.secondary,
    marginBottom: space[2],
    marginTop: space[1],
  },
  rateSource: {
    ...type.bodyEmphasis,
    color: colors.text.primary,
    flex: 1,
  },
  rateTitle: {
    ...type.label,
    color: colors.text.secondary,
    marginBottom: space[1],
  },
  rateValues: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: space[3],
    justifyContent: 'space-between',
  },
  settledPill: {
    alignItems: 'center',
    backgroundColor: colors.surface.cardStrong,
    borderRadius: radius.pill,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: space[4],
  },
  settledText: {
    ...type.label,
    color: colors.text.primary,
  },
  shell: {
    aspectRatio: 2.21,
    borderRadius: radius.condition,
    overflow: 'hidden',
    width: '100%',
  },
  status: {
    ...type.micro,
    color: colors.text.primary,
  },
  statusDot: {
    borderRadius: radius.pill,
    height: 8,
    width: 8,
  },
  subtitle: {
    ...type.caption,
    color: colors.text.secondary,
    marginTop: space[1],
  },
  title: {
    ...type.cardHeroTitle,
    color: colors.text.primary,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingHorizontal: space[4],
    paddingTop: space[3],
  },
});
