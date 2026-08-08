import { useEffect, useRef, useState } from 'react';
import { Image, ImageBackground, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';

import {
  AccessibleModal,
  AccessibleModalTitle,
  LiveRing,
  PillowCard,
  PillButton,
  PressableScale,
  SettingsRow,
  SwitchRow,
  colors,
  space,
  type,
} from '@/design-system';
import { walkSessionAlerts, walkSessionStates } from '@/content/sessions';
import type { GymPhase, WalkPhase } from '@/presentation';
import { FeatureScaffold, PrototypeNotice } from '@/features/shared';

export type WalkPermissionTarget = 'location' | 'motion';

export type WalkSessionScreenProps = {
  alwaysShow: boolean;
  conditionSummary?: {
    ruleSummary: string;
    title: string;
  };
  graceDurationSeconds: number;
  onBack: () => void;
  onCancel: () => void;
  onEnd: (reason: 'user' | 'stopped') => void;
  onGraceExpired: () => void;
  onOpenPermission: (permission: WalkPermissionTarget) => void;
  onPause: () => void;
  onResume: () => void;
  onStart: () => void;
  onToggleAlwaysShow: (value: boolean) => void;
  onWhyLocked: () => void;
  phase: WalkPhase;
};

export function WalkSessionScreen({
  alwaysShow,
  conditionSummary,
  graceDurationSeconds,
  onBack,
  onCancel,
  onEnd,
  onGraceExpired,
  onOpenPermission,
  onPause,
  onResume,
  onStart,
  onToggleAlwaysShow,
  onWhyLocked,
  phase,
}: WalkSessionScreenProps) {
  const content = walkContent(phase);
  const active = phase === 'active';
  const grace = phase === 'grace';
  const paused = phase === 'paused';
  const resumable = grace || paused;
  const ended = phase === 'ended-by-user' || phase === 'ended-stopped';
  const normalizedGraceDuration = Math.max(1, Math.floor(graceDurationSeconds));
  const [elapsedSeconds, setElapsedSeconds] = useState(18 * 60 + 42);
  const [balanceSeconds, setBalanceSeconds] = useState(7 * 60);
  const [graceSeconds, setGraceSeconds] = useState(normalizedGraceDuration);
  const [overlay, setOverlay] = useState<
    | { kind: 'pause' }
    | { kind: 'end'; reason: 'user' | 'stopped' }
    | { kind: 'details' }
    | { kind: 'condition' }
    | { kind: 'why' }
    | null
  >(null);
  const graceExpiredRef = useRef(onGraceExpired);
  graceExpiredRef.current = onGraceExpired;

  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => {
      setElapsedSeconds((value) => value + 1);
      setBalanceSeconds((value) => Math.max(0, value - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [active]);

  useEffect(() => {
    if (!grace) {
      setGraceSeconds(normalizedGraceDuration);
      return;
    }
    const timer = setInterval(() => {
      setGraceSeconds((value) => {
        if (value > 1) return value - 1;
        clearInterval(timer);
        graceExpiredRef.current();
        return 0;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [grace, normalizedGraceDuration]);

  useEffect(() => {
    if (phase !== 'verifying') return;
    setElapsedSeconds(18 * 60 + 42);
    setBalanceSeconds(7 * 60);
    setGraceSeconds(normalizedGraceDuration);
    setOverlay(null);
  }, [normalizedGraceDuration, phase]);

  const elapsedLabel = formatClock(elapsedSeconds);
  const balanceLabel = formatClock(balanceSeconds);
  const sampleSteps = 2146 + Math.floor(Math.max(0, elapsedSeconds - (18 * 60 + 42)) / 2);

  const overlayTitle = overlay?.kind === 'pause'
    ? walkSessionAlerts.pause.title
    : overlay?.kind === 'end'
      ? walkSessionAlerts.end.title
      : overlay?.kind === 'details'
        ? 'Walk details'
        : overlay?.kind === 'condition'
          ? conditionSummary?.title ?? 'Condition summary'
        : overlay?.kind === 'why'
          ? walkSessionAlerts.whyLocked.title
          : 'Walk action';

  return (
    <>
      <FeatureScaffold accessibilityLabel={content.title} canvasVariant="night" onBack={!active ? onBack : undefined} scroll={false}>
      <View style={styles.session}>
        <View style={styles.sessionCopy}>
          {active ? <Text style={styles.activeChip}>ACTIVE</Text> : null}
          <Text style={styles.title}>{content.title}</Text>
          {content.body ? <Text style={styles.body}>{content.body}</Text> : null}
        </View>

        {conditionSummary ? (
          <PressableScale
            accessibilityLabel={`Open ${conditionSummary.title} condition summary`}
            accessibilityRole="button"
            onPress={() => setOverlay({ kind: 'condition' })}
          >
            <PillowCard style={styles.conditionSummary} variant="night">
              <Text style={styles.conditionEyebrow}>{walkConditionPhaseLabel(phase)} · TAP FOR DETAILS</Text>
              <Text style={styles.conditionTitle}>{conditionSummary.title}</Text>
              <Text style={styles.conditionRule}>{conditionSummary.ruleSummary}</Text>
            </PillowCard>
          </PressableScale>
        ) : null}

        {phase === 'ready' ? (
          <Image
            accessibilityIgnoresInvertColors
            resizeMode="contain"
            source={require('../../../assets/heroes/permission-health-motion.png')}
            style={styles.sessionHero}
          />
        ) : (
          <LiveRing
            accessibilityLabel={active ? `${elapsedLabel} elapsed, ${balanceLabel} sample balance remaining` : grace ? `${graceSeconds} seconds grace remaining` : paused ? 'Walking paused, ready to resume' : ended ? '24 minutes 18 seconds completed' : 'Finding sample walking rhythm'}
            caption={active ? 'elapsed' : grace ? 'grace remaining' : paused ? 'session paused' : ended ? 'completed' : 'sample cadence'}
            color={active ? colors.semantic.success : paused ? colors.brand.energyAction : colors.semantic.attention}
            progress={active ? 0.68 : grace ? graceSeconds / normalizedGraceDuration : paused ? 1 : ended ? 1 : 0.22}
            value={active ? elapsedLabel : grace ? formatClock(graceSeconds) : paused ? 'PAUSED' : ended ? '24:18' : '…'}
          />
        )}

        {phase === 'ready' ? (
          <PillowCard padding="none" variant="night">
            {walkSessionStates.ready.statusRows.map((row) => {
              const permissionTarget = walkPermissionTarget(row.label);
              return (
                <SettingsRow
                  key={row.label}
                  onPress={permissionTarget ? () => onOpenPermission(permissionTarget) : undefined}
                  showChevron={permissionTarget !== null}
                  title={row.label}
                  value={row.value}
                />
              );
            })}
            <View style={styles.rowDivider} />
            <SwitchRow
              onValueChange={onToggleAlwaysShow}
              subtitle="Keep the live walking card visible on Home"
              title="Always show"
              value={alwaysShow}
            />
          </PillowCard>
        ) : null}
        {active ? <Text accessibilityLiveRegion="polite" style={styles.metric}>{sampleSteps.toLocaleString()} sample steps · {balanceLabel} left</Text> : null}
        {ended ? (
          <PillowCard style={styles.summaryCard} variant="strong">
            <Text style={styles.summaryTitle}>Sample session summary</Text>
            <Text style={styles.body}>24:18 moving · 2,804 sample steps · 24 min access kept open</Text>
            <Text style={styles.body}>Balance drained normally.</Text>
            <PillButton label="Session details" onPress={() => setOverlay({ kind: 'details' })} variant="secondary" />
            <PillButton label="Why did apps lock?" onPress={() => setOverlay({ kind: 'why' })} variant="text" />
          </PillowCard>
        ) : null}
        <PrototypeNotice>Balance drains normally. No motion, steps, or location are read.</PrototypeNotice>

        <View style={styles.actions}>
          {phase === 'ready' ? (
            <>
              <PillButton fullWidth label="Start walking" onPress={onStart} variant="screen" />
              <PillButton fullWidth label="Cancel" onPress={onCancel} variant="secondary" />
            </>
          ) : null}
          {phase === 'verifying' ? <PillButton fullWidth label="Cancel" onPress={onCancel} variant="secondary" /> : null}
          {active ? (
            <>
              <PillButton fullWidth label="Pause" onPress={() => setOverlay({ kind: 'pause' })} variant="screen" />
              <PillButton fullWidth label="End session" onPress={() => setOverlay({ kind: 'end', reason: 'user' })} variant="secondary" />
            </>
          ) : null}
          {resumable ? (
            <>
              <PillButton fullWidth label="Resume walking" onPress={onResume} variant="screen" />
              <PillButton fullWidth label="End session" onPress={() => setOverlay({ kind: 'end', reason: paused ? 'user' : 'stopped' })} variant="secondary" />
            </>
          ) : null}
          {ended ? (
            <>
              <PillButton fullWidth label="Done" onPress={onBack} variant="screen" />
              <PillButton fullWidth label={phase === 'ended-stopped' ? 'Keep walking' : 'Start again'} onPress={onStart} variant="secondary" />
            </>
          ) : null}
          {phase === 'permission-lost' ? (
            <>
              <PillButton fullWidth label="Try again" onPress={onStart} variant="screen" />
              <PillButton fullWidth label="Instructions" onPress={() => onOpenPermission('motion')} variant="secondary" />
              <PillButton fullWidth label="Back" onPress={onBack} variant="secondary" />
            </>
          ) : null}
        </View>
      </View>
      </FeatureScaffold>

      <AccessibleModal
        accessibilityTitle={overlayTitle}
        animationType="fade"
        onRequestClose={() => setOverlay(null)}
        style={styles.modalBackdrop}
        visible={overlay !== null}
      >
        <PillowCard style={styles.modalCard} variant="light">
          <Text style={styles.modalEyebrow}>LOCAL SESSION PREVIEW</Text>
          <AccessibleModalTitle style={styles.modalTitle}>{overlayTitle}</AccessibleModalTitle>
          {overlay?.kind === 'pause' ? (
            <>
              <Text style={styles.modalBody}>{walkSessionAlerts.pause.body}</Text>
              <PillButton
                accessibilityLabel="Confirm pause"
                fullWidth
                label="Pause walking"
                onPress={() => {
                  setOverlay(null);
                  onPause();
                }}
                variant="dark"
              />
              <PillButton fullWidth label="Keep walking" onPress={() => setOverlay(null)} variant="text" />
            </>
          ) : null}
          {overlay?.kind === 'end' ? (
            <>
              <Text style={styles.modalBody}>{walkSessionAlerts.end.body}</Text>
              <PillButton
                accessibilityLabel="Confirm end session"
                fullWidth
                label="End session"
                onPress={() => {
                  const reason = overlay.reason;
                  setOverlay(null);
                  onEnd(reason);
                }}
                variant="dark"
              />
              <PillButton fullWidth label="Keep walking" onPress={() => setOverlay(null)} variant="text" />
            </>
          ) : null}
          {overlay?.kind === 'details' ? (
            <>
              <Text style={styles.modalDetail}>24:18 moving</Text>
              <Text style={styles.modalDetail}>2,804 sample steps</Text>
              <Text style={styles.modalDetail}>24 min access kept open</Text>
              <Text style={styles.modalBody}>The sample balance drained normally while access stayed open.</Text>
              <PillButton accessibilityLabel="Close walk details" fullWidth label="Done" onPress={() => setOverlay(null)} variant="dark" />
            </>
          ) : null}
          {overlay?.kind === 'condition' && conditionSummary ? (
            <>
              <Text style={styles.modalDetail}>{conditionSummary.title}</Text>
              <Text style={styles.modalBody}>{conditionSummary.ruleSummary}</Text>
              <Text style={styles.modalBody}>Access stays open while the fake walking session remains active. The sample balance drains normally.</Text>
              <PillButton fullWidth label="Done" onPress={() => setOverlay(null)} variant="dark" />
            </>
          ) : null}
          {overlay?.kind === 'why' ? (
            <>
              <Text style={styles.modalBody}>{walkSessionAlerts.whyLocked.body}</Text>
              <PillButton
                fullWidth
                label="View lock moment"
                onPress={() => {
                  setOverlay(null);
                  onWhyLocked();
                }}
                variant="dark"
              />
              <PillButton fullWidth label="Got it" onPress={() => setOverlay(null)} variant="text" />
            </>
          ) : null}
        </PillowCard>
      </AccessibleModal>
    </>
  );
}

function formatClock(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function walkPermissionTarget(label: string): WalkPermissionTarget | null {
  if (label === 'Motion & Fitness') return 'motion';
  if (label === 'Location') return 'location';
  return null;
}

function walkContent(phase: WalkPhase): { title: string; body?: string } {
  switch (phase) {
    case 'ready': return walkSessionStates.ready;
    case 'verifying': return walkSessionStates.verifying;
    case 'active': return { title: walkSessionStates.active.title, body: walkSessionStates.active.balanceLine };
    case 'paused': return walkSessionStates.paused;
    case 'grace': return walkSessionStates.grace;
    case 'ended-by-user': return { title: walkSessionStates.endedByUser.title, body: walkSessionStates.endedByUser.cause };
    case 'ended-stopped': return walkSessionStates.endedStopped;
    case 'permission-lost': return walkSessionStates.permissionLost;
  }
}

export type GymSessionScreenProps = {
  condition?: {
    kind: 'event' | 'state' | 'rate';
    name: string;
    ruleSummary: string;
  };
  gym?: {
    banner: ImageSourcePropType;
    name: string;
    radiusMeters: number;
  };
  onBack: () => void;
  onCancel: () => void;
  onDone: () => void;
  onOpenPermission: () => void;
  onRetry: () => void;
  onStart: () => void;
  onViewCondition: () => void;
  phase: GymPhase;
};

export function GymSessionScreen({ condition, gym, onBack, onCancel, onDone, onOpenPermission, onRetry, onStart, onViewCondition, phase }: GymSessionScreenProps) {
  const conditionName = condition?.name ?? 'Go to gym';
  const conditionRule = condition?.ruleSummary ?? 'Check in once to add 30 minutes.';
  const conditionKind = condition?.kind ?? 'event';
  const gymName = gym?.name ?? 'Harbor Strength';
  const radiusMeters = gym?.radiusMeters ?? 100;
  const gymBanner = gym?.banner ?? require('../../../assets/banners/gym-weights-floor.png');
  const content = gymContent(phase, {
    conditionKind,
    conditionName,
    gymName,
    radiusMeters,
  });
  const locationHealth = gymLocationHealth[phase];
  return (
    <FeatureScaffold accessibilityLabel={content.title} canvasVariant="night" onBack={phase !== 'verifying' ? onBack : undefined} scroll={false}>
      <View style={styles.session}>
        <View style={styles.sessionCopy}>
          {phase === 'verified' ? <Text style={styles.activeChip}>VERIFIED</Text> : null}
          <Text style={styles.title}>{content.title}</Text>
          <Text style={styles.body}>{content.body}</Text>
        </View>
        <PillowCard style={styles.conditionSummary} variant="night">
          <Text style={styles.conditionEyebrow}>SELECTED CONDITION</Text>
          <Text style={styles.conditionTitle}>{conditionName}</Text>
          <Text style={styles.conditionRule}>{conditionRule}</Text>
        </PillowCard>
        {phase === 'verifying' ? (
          <View style={styles.verifyingGym}>
            <LiveRing
              accessibilityLabel={`Checking ${gymName} within a ${radiusMeters} meter sample radius`}
              caption="sample radius"
              color={colors.semantic.attention}
              progress={0.45}
              value={`${radiusMeters} m`}
            />
            <Text style={styles.gymVerifyName}>{gymName} · {radiusMeters} m radius</Text>
          </View>
        ) : (
          <ImageBackground
            accessibilityIgnoresInvertColors
            imageStyle={styles.gymBannerImage}
            source={gymBanner}
            style={styles.gymBanner}
          >
            <View style={styles.gymBannerScrim}>
              <Text style={styles.gymName}>{gymName}</Text>
              <Text style={styles.gymMeta}>Sample location · {radiusMeters} m radius</Text>
            </View>
          </ImageBackground>
        )}
        <PillowCard padding="none" variant="night">
          <SettingsRow
            onPress={onOpenPermission}
            subtitle={locationHealth.subtitle}
            title="Location health"
            value={locationHealth.value}
          />
        </PillowCard>
        <PrototypeNotice>No location service is running. This page changes only hardcoded demo state.</PrototypeNotice>
        <View style={styles.actions}>
          {phase === 'ready' ? (
            <>
              <PillButton fullWidth label="Check in" onPress={onStart} variant="screen" />
              <PillButton fullWidth label="Cancel" onPress={onCancel} variant="secondary" />
            </>
          ) : null}
          {phase === 'verifying' ? <PillButton fullWidth label="Cancel" onPress={onCancel} variant="secondary" /> : null}
          {phase === 'verified' ? (
            <>
              <PillButton fullWidth label="Done" onPress={onDone} variant="screen" />
              <PillButton fullWidth label="View condition" onPress={onViewCondition} variant="secondary" />
            </>
          ) : null}
          {phase === 'failed' ? (
            <>
              <PillButton fullWidth label="Try again" onPress={onRetry} variant="screen" />
              <PillButton fullWidth label="Instructions" onPress={onOpenPermission} variant="secondary" />
              <PillButton fullWidth label="Back" onPress={onBack} variant="secondary" />
            </>
          ) : null}
        </View>
      </View>
    </FeatureScaffold>
  );
}

function walkConditionPhaseLabel(phase: WalkPhase) {
  switch (phase) {
    case 'ready': return 'READY CONDITION';
    case 'verifying': return 'VERIFYING CONDITION';
    case 'active': return 'ACTIVE CONDITION';
    case 'paused': return 'PAUSED CONDITION';
    case 'grace': return 'GRACE CONDITION';
    case 'ended-by-user':
    case 'ended-stopped': return 'ENDED CONDITION';
    case 'permission-lost': return 'CONDITION NEEDS ATTENTION';
  }
}

const gymLocationHealth: Record<GymPhase, { subtitle: string; value: string }> = {
  failed: {
    subtitle: 'The simulated local check needs attention; no coordinates were read',
    value: 'Needs attention',
  },
  ready: {
    subtitle: 'The hardcoded sample is ready; no coordinates are read',
    value: 'Sample ready',
  },
  verified: {
    subtitle: 'The hardcoded check completed locally; no coordinates were read',
    value: 'Verified in demo',
  },
  verifying: {
    subtitle: 'The simulated local check is in progress; no location service is running',
    value: 'Checking locally',
  },
};

function gymContent(
  phase: GymPhase,
  context: {
    conditionKind: 'event' | 'state' | 'rate';
    conditionName: string;
    gymName: string;
    radiusMeters: number;
  },
) {
  switch (phase) {
    case 'ready':
      return {
        body: `This preview checks ${context.gymName} within a sample ${context.radiusMeters} m radius. No location is read.`,
        title: `Check in for ${context.conditionName}.`,
      };
    case 'verifying':
      return {
        body: `${context.gymName} · ${context.radiusMeters} m sample radius. No location service is running.`,
        title: `Checking ${context.gymName}…`,
      };
    case 'verified':
      return context.conditionKind === 'event'
        ? {
            body: `${context.conditionName} completed in local demo state. Its configured reward is ready for Home.`,
            title: `Verified at ${context.gymName}.`,
          }
        : {
            body: `${context.conditionName} is active while this sample gym presence stays verified. Balance drains normally.`,
            title: `Active at ${context.gymName}.`,
          };
    case 'failed':
      return {
        body: `${context.gymName} could not be verified within the sample ${context.radiusMeters} m radius. Your selected condition is still here.`,
        title: `Couldn’t verify ${context.conditionName}.`,
      };
  }
}

const styles = StyleSheet.create({
  actions: { gap: space[2], width: '100%' },
  activeChip: { ...type.micro, alignSelf: 'center', backgroundColor: colors.surface.cardStrong, borderRadius: 999, color: colors.semantic.success, overflow: 'hidden', paddingHorizontal: space[3], paddingVertical: space[2] },
  body: { ...type.body, color: colors.text.secondary, textAlign: 'center' },
  conditionEyebrow: { ...type.micro, color: colors.brand.signatureAmber },
  conditionRule: { ...type.caption, color: colors.text.secondary },
  conditionSummary: { alignSelf: 'stretch', gap: space[1] },
  conditionTitle: { ...type.cardTitle, color: colors.text.primary },
  gymBanner: { height: 180, justifyContent: 'flex-end', overflow: 'hidden', width: '100%' },
  gymBannerImage: { borderRadius: 24 },
  gymBannerScrim: { backgroundColor: 'rgba(18,12,5,0.72)', borderBottomLeftRadius: 24, borderBottomRightRadius: 24, gap: space[1], padding: space[4] },
  gymMeta: { ...type.caption, color: colors.text.secondary },
  gymName: { ...type.cardTitle, color: colors.text.primary },
  gymVerifyName: { ...type.cardTitle, color: colors.text.primary, textAlign: 'center' },
  metric: { ...type.statValue, color: colors.text.primary, textAlign: 'center' },
  modalBackdrop: { backgroundColor: colors.surface.scrim, flex: 1, justifyContent: 'flex-end', padding: space[4] },
  modalBody: { ...type.body, color: colors.text.ink, opacity: 0.72 },
  modalCard: { gap: space[3], padding: space[5] },
  modalDetail: { ...type.sectionTitle, color: colors.text.ink },
  modalEyebrow: { ...type.micro, color: colors.brand.burnt },
  modalTitle: { ...type.screenTitle, color: colors.text.ink },
  rowDivider: { backgroundColor: colors.surface.divider, height: 1 },
  session: { alignItems: 'center', flex: 1, gap: space[5], justifyContent: 'center', paddingBottom: space[4] },
  sessionCopy: { gap: space[2] },
  sessionHero: { height: 210, width: 230 },
  summaryCard: { alignSelf: 'stretch', gap: space[2] },
  summaryTitle: { ...type.cardTitle, color: colors.text.primary },
  title: { ...type.screenLarge, color: colors.text.primary, textAlign: 'center' },
  verifyingGym: { alignItems: 'center', gap: space[2] },
});
