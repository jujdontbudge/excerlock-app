import { HomeLockStatus } from './HomeLockStatus';
import { ProgressBar } from '../../design-system/ProgressBar';
import { scheduleLabel } from '../../domain/scheduleLabel';
import { dayKey } from '../../domain/calendar';
import { Icon } from '../../icons/Icon';
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
import { profileStore as useProfileStore } from '../../state/profileStore';
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
  const name = useProfileStore((s) => s.data.name);
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
  const chooseApps = () => void runtime.screenTime.presentAppPicker();
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
    const active = decision.state === 'locked' && decision.activeRuleIds.includes(rule.id);
    const atGym = kind === 'gym' && !row.met ? presence : null;
    const walk = 'state' in model ? model.state : 'idle';
    const status: { label: string; tone: 'success' | 'primary' | 'secondary' } = row.met
      ? { label: c.complete, tone: 'success' }
      : atGym
        ? atGym.confirmedAt
          ? { label: c.presentGym, tone: 'success' }
          : { label: c.confirmingGym, tone: 'primary' }
        : walk === 'active' || walk === 'grace'
          ? { label: c.walkDetected, tone: 'success' }
              : { label: active ? c.inProgress : c.scheduled, tone: 'primary' };
    const detected = status.tone === 'success';
    const onAction = () => {
      if (kind) router.push({ pathname: `/unlock/${kind}`, params: { ruleId: rule.id } });
    };
    return (
      <View key={rule.id} testID={`home-condition-${rule.id}`} style={{
        backgroundColor: t.surface.card, borderRadius: t.radius.card,
        borderWidth: t.stroke.hairline, borderColor: t.border.outline,
        padding: t.space.lg, gap: t.space.md,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.md }}>
          <Icon name={model.icon} variant="utility" size={32} tint={t.brand.primary} />
          <View style={{ flex: 1, gap: t.space.xs }}>
            <Label variant="label">{model.title}</Label>
            <Label variant="support" tone="secondary">{scheduleLabel(rule.schedule)}</Label>
          </View>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: t.space.md }}>
          <Label variant="support" style={{ color: detected ? t.state.success : t.text.primary, fontWeight: detected ? '600' : '400' }}>
            {status.label}
          </Label>
          {rule.mode.kind === 'state' ? null : <Label variant="support" tone="secondary">{`${Math.round(Math.max(0, Math.min(1, model.value)) * 100)}%`}</Label>}
        </View>
        <Label variant="label">{model.detail}</Label>
        {rule.mode.kind === 'state' ? null : <ProgressBar value={Math.max(0, Math.min(1, model.value))} label={model.title} tone={detected ? 'success' : 'brand'} />}
        {row.met ? null : rule.mode.kind === 'state' ? (
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
      </View>
    );
  });
  return (
    <ScreenShell dock
      onLayout={markHomeLayout}
      orangeBackground
      safeBottom={false}
      scrollUnderStatusBar={false}
      >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: t.space.md }}>
        <View style={{ flex: 1, gap: t.space.xs }}>
          <Label variant="question" accessibilityRole="header">
            {c.greeting(name)}
          </Label>
        </View>
        <StreakBadge count={streak.current} />
      </View>
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
        <Label variant="section" accessibilityRole="header">{c.today}</Label>
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
            iconTint={t.brand.primary}
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
            iconTint={t.brand.primary}
            onPress={() => router.navigate('/analytics')}
          />
        </View>
        {!conditions.length ? <SecondaryButton label={c.add} onPress={add} /> : null}
      </View>
    </ScreenShell>
  );
}
