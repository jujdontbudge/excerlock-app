import { HomeLockStatus } from './HomeLockStatus';
import { HomeConditionCard } from './HomeConditionCard';
import { scheduleLabel } from '../../domain/scheduleLabel';
import { dayKey } from '../../domain/calendar';
import { useDemoProgress } from './useDemoProgress';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import {
  ScreenShell,
  SettingsRow,
  StreakBadge,
  SecondaryButton,
  Label,
} from '../../design-system';
import { tokens as t } from '../../design-system/tokens';
import { useRuntime } from '../../runtime/AppRuntimeProvider';
import { useRuntimeStatus, useLockDecision, useTodayProgress, useStreak, useWalkingStatus } from '../../state/selectors';
import { useHomeClock } from '../../state/homeClock';
import { rulesStore as useRulesStore } from '../../state/rulesStore';
import { permissionsStore as usePermissionsStore } from '../../state/permissionsStore';
import { settingsStore as useSettingsStore } from '../../state/settingsStore';
import { ruleDaysStore as useRuleDaysStore } from '../../state/ruleDaysStore';
import { statusContent } from './statusContent';
import { progressContent } from './progressContent';
import { useUnlockMoment } from './useUnlockMoment';
import { homeCopy as c } from '../../content/home';
import { Reveal } from '../../motion/Reveal';
import { unlockKind } from '../unlock/entry';
import { UnlockEntry } from '../unlock/UnlockEntry';
import { WalkingCheckButton } from './WalkingCheckButton';
import { useInteractiveHomeMarker } from '../../runtime/startup/useInteractiveHomeMarker';
import { useLapsedWinbackOffer } from '../subscription/useLapsedWinbackOffer';
import { useLockListPicker } from '../permissions/useLockListPicker';
import { SetupReminder } from './SetupReminder';
export function HomeScreen() {
  useDemoProgress();
  useLapsedWinbackOffer();
  const runtime = useRuntime(),
    router = useRouter(),
    homeClock = useHomeClock(),
    now = homeClock.now,
    decision = useLockDecision(now),
    progress = useTodayProgress(now),
    streak = useStreak(now);
  const { scheduleIssue, loading, hydrated } = useRuntimeStatus();
  const markHomeLayout = useInteractiveHomeMarker(runtime, !loading && hydrated);
  const { rules, lockedApps } = useRulesStore((s) => s.data),
    permissions = usePermissionsStore((s) => s.data),
    auto = useSettingsStore((s) => s.data.gymAutoDetect),
    session = useWalkingStatus(),
    presence = useRuleDaysStore((s) => s.data.gymPresence);
  const status = statusContent({
      decision,
      rules,
      apps: lockedApps,
      permissions,
      now,
      timezone: runtime.clock.timezone(),
    }),
    glyph = useUnlockMoment(status.state);
  const { open: chooseApps } = useLockListPicker();
  const add = () => router.push('/builder');
  useEffect(() => {
    runtime.analytics.screen('Home');
  }, [runtime]);
  // Every enabled condition is listed, not only the ones scheduled today; an off-day
  // condition shows as scheduled with no progress yet.
  const conditions = rules
    .filter((rule) => rule.enabled)
    .map((rule) => progress.find((entry) => entry.rule.id === rule.id) ?? {
      rule,
      row: { ruleId: rule.id, day: dayKey(now, runtime.clock.timezone()), progress: 0, met: false, metAt: null },
    });
  const conditionCards = conditions.map(({ rule, row }) => {
    const model = progressContent(rule, row, permissions, session, auto);
    const kind = unlockKind(rule);
    const atGym = kind === 'gym' && !row.met ? presence : null;
    const walk = 'state' in model ? model.state : 'idle';
    const detected = row.met || Boolean(atGym?.confirmedAt) || walk === 'active' || walk === 'grace';
    const onAction = () => {
      if (kind) router.push({ pathname: `/unlock/${kind}`, params: { ruleId: rule.id } });
    };
    return (
      <HomeConditionCard
        key={rule.id}
        testID={`home-condition-${rule.id}`}
        icon={model.icon}
        title={model.title}
        schedule={scheduleLabel(rule.schedule)}
        detail={model.detail}
        progress={rule.mode.kind === 'state' ? null : { value: model.value, tone: detected ? 'success' : 'brand' }}>
        {row.met ? null : model.action === 'walk' ? (
          <>
            <WalkingCheckButton rule={rule} checkWalking={(target) => runtime.walking.check(target)} />
            {walk === 'idle' ? <UnlockEntry kind="treadmill" label={c.treadmillEntry} onPress={() => router.push({ pathname: '/unlock/treadmill', params: { ruleId: rule.id } })} /> : null}
          </>
        ) : kind === 'gym' ? (
          <UnlockEntry
            kind={kind}
            label={atGym ? (atGym.confirmedAt ? c.presentGym : c.confirmingGym) : c.gymEntry}
            onPress={onAction}
            inverted
          />
        ) : 'label' in model && model.label ? (
          <SecondaryButton label={model.label} onPress={onAction} />
        ) : null}
      </HomeConditionCard>
    );
  });
  return (
    <ScreenShell dock
      onLayout={markHomeLayout}
      orangeBackground
      safeBottom={false}
      scrollUnderStatusBar={false}
      >
      {/* The app name sits in the middle of the screen; the streak badge keeps the right edge. */}
      <View style={{ justifyContent: 'center' }}>
        <Label variant="display" accessibilityRole="header" style={{ textAlign: 'center' }}>
          {c.title}
        </Label>
        <View style={{ position: 'absolute', right: 0 }}>
          <StreakBadge count={streak.current} />
        </View>
      </View>
      {/* Anything a condition still needs gets one card here, above everything else (ADR 0043). */}
      <SetupReminder />
      {scheduleIssue ? (
        <View accessibilityRole="alert" style={{ padding: t.space.md, gap: t.space.md,
          backgroundColor: t.surface.card, borderRadius: t.radius.card,
          borderWidth: t.stroke.hairline, borderColor: t.border.outline }}>
          <Label variant="section">{c.scheduleRecoveryTitle}</Label>
          <Label variant="support">{c.scheduleRecoveryBody}</Label>
          <SecondaryButton label={c.scheduleRecoveryAction} onPress={() => router.navigate('/conditions')} />
        </View>
      ) : (
        <Animated.View style={glyph}>
          <HomeLockStatus unlocked={status.unlocked} />
        </Animated.View>
      )}
      {status.state === 'allPaused' ? (
        <Label accessibilityRole="header" variant="section">
          {c.paused}
        </Label>
      ) : null}
      <View style={{ gap: t.space.md }}>
        {conditionCards}
      </View>
      <Reveal>
        <View
          style={{
            backgroundColor: t.surface.card,
            borderRadius: t.radius.pill,
            borderWidth: t.stroke.hairline,
            borderColor: t.border.outline,
          }}>
          <SettingsRow
            title={c.lockedApps}
            icon="lock"
            onPress={chooseApps}
          />
        </View>
      </Reveal>
      <View style={{ gap: t.space.lg }}>
        <View
          style={{
            backgroundColor: t.surface.card,
            borderRadius: t.radius.pill,
            borderWidth: t.stroke.hairline,
            borderColor: t.border.outline,
          }}>
          <SettingsRow
            title={c.analytics}
            icon="chart"
            onPress={() => router.navigate('/analytics')}
          />
        </View>
        {!conditions.length ? <SecondaryButton label={c.add} onPress={add} /> : null}
      </View>
    </ScreenShell>
  );
}
