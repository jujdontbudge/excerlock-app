import { BankSection } from './BankSection';
import { useBank } from '../bank/Bank';
import { GymBackgroundSetup } from '../gyms/GymBackgroundSetup';
import { ScreenTimePickerHost } from '../app-selection/ScreenTimePickerHost';
import { HomeLockStatus } from './HomeLockStatus';
import { HomeConditionCard } from './HomeConditionCard';
import { scheduleLabel } from '../schedule/scheduleLabel';
import { dayKey } from '../schedule/calendar';
import { useDemoProgress } from './lib/useDemoProgress';
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
} from '../ui';
import { tokens as t } from '../ui/tokens';
import { useRuntime } from '../ports/useRuntime';
import { useRuntimeStatus, useLockDecision, useTodayProgress, useStreak, useWalkingStatus } from '../lock/selectors';
import { useHomeClock } from './lib/homeClock';
import { rulesStore as useRulesStore } from '../conditions/rulesStore';
import { permissionsStore as usePermissionsStore } from '../permissions/permissionsStore';
import { settingsStore as useSettingsStore } from '../preferences/settingsStore';
import { ruleDaysStore as useRuleDaysStore } from '../conditions/ruleDaysStore';
import { statusContent } from './lib/statusContent';
import { progressContent } from './progressContent';
import { useUnlockMoment } from './lib/useUnlockMoment';
import { homeCopy as c } from './homeCopy';
import { Reveal } from '../ui/Reveal';
import { unlockKind } from '../unlock/entry';
import { UnlockEntry } from '../unlock/UnlockEntry';
import { WalkingCheckButton } from './lib/WalkingCheckButton';
import { useInteractiveHomeMarker } from './lib/native/useInteractiveHomeMarker';
import { useLapsedWinbackOffer } from '../subscription/useLapsedWinbackOffer';
import { useLockListPicker } from '../app-selection/useLockListPicker';
import { SetupReminder } from './lib/SetupReminder';
export function HomeScreen() {
  useDemoProgress();
  useLapsedWinbackOffer();
  const bank = useBank();
  const runtime = useRuntime(),
    router = useRouter(),
    homeClock = useHomeClock(),
    now = homeClock.now,
    decision = useLockDecision(now),
    progress = useTodayProgress(now),
    streak = useStreak(now);
  const { scheduleIssue, loading, hydrated, shieldLifts } = useRuntimeStatus();
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
    glyph = useUnlockMoment(status.state, shieldLifts);
  const { open: chooseApps } = useLockListPicker();
  const add = () => router.push('/builder');
  useEffect(() => {
    runtime.analytics.screen('Home');
  }, [runtime]);
  const conditions = rules
    .filter((rule) => rule.enabled)
    .map((rule) => progress.find((entry) => entry.rule.id === rule.id) ?? {
      rule,
      row: { ruleId: rule.id, day: dayKey(now, runtime.clock.timezone()), progress: 0, met: false, metAt: null },
    });
  const conditionCards = conditions.filter(({ rule }) => rule.mode.kind !== 'bank').map(({ rule, row }) => {
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
      overlay={<><ScreenTimePickerHost /><GymBackgroundSetup /></>}
      onLayout={markHomeLayout}
      orangeBackground
      safeBottom={false}
      scrollUnderStatusBar={false}
      >
      <View style={{ justifyContent: 'center' }}>
        <Label variant="display" accessibilityRole="header" style={{ textAlign: 'center' }}>
          {c.title}
        </Label>
        <View style={{ position: 'absolute', right: 0 }}>
          <StreakBadge count={streak.current} />
        </View>
      </View>
      <SetupReminder />
      {bank ? null : scheduleIssue ? (
        <View style={{ padding: t.space.md, gap: t.space.md,
          backgroundColor: t.surface.softChoice, borderRadius: t.radius.card,
          borderWidth: t.stroke.hairline, borderColor: t.surface.transparent }}>
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
        {bank ? <BankSection onShop={() => router.navigate('/shop')} /> : conditionCards}
      </View>
      <Reveal>
        <View
          style={{
            backgroundColor: t.surface.softChoice,
            borderRadius: t.radius.pill,
            borderWidth: t.stroke.hairline,
            borderColor: t.surface.transparent,
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
            backgroundColor: t.surface.softChoice,
            borderRadius: t.radius.pill,
            borderWidth: t.stroke.hairline,
            borderColor: t.surface.transparent,
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
