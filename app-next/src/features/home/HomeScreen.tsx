import { HomeSheets } from '../sessions/HomeSheets';
import { BlockingScheduleCard } from '../../design-system/BlockingScheduleCard';
import { blockingSchedule } from './blockingSchedule';
import { dayMinute } from './mergedHomeIntervals';
import { ruleName } from '../../domain/ruleName';
import { conditionState, conditionStatus } from '../../domain/conditionState';
import { useDemoProgress } from './useDemoProgress';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import {
  ScreenShell,
  Heading,
  StatusCard,
  ProgressCard,
  SettingsRow,
  StreakBadge,
  SecondaryButton,
} from '../../design-system';
import { tokens as t } from '../../design-system/tokens';
import { useRuntime } from '../../runtime/AppRuntimeProvider';
import { useClock, useLockDecision, useTodayProgress, useStreak } from '../../state/selectors';
import { profileStore as useProfileStore } from '../../state/profileStore';
import { rulesStore as useRulesStore } from '../../state/rulesStore';
import { permissionsStore as usePermissionsStore } from '../../state/permissionsStore';
import { settingsStore as useSettingsStore } from '../../state/settingsStore';
import { ruleDaysStore as useRuleDaysStore } from '../../state/ruleDaysStore';
import { statusContent } from './statusContent';
import { progressContent, sensorFor } from './progressContent';
import { useLastClaimAt } from './claimState';
import { useUnlockMoment } from './useUnlockMoment';
import { homeCopy as c } from '../../content/home';
import { lockedAppsSummary } from '../../content/pickers';
import { LivingIcon } from '../../motion/LivingIcon';
import { Reveal } from '../../motion/Reveal';
import { Rule } from '../../domain/types';
import { unlockEntries, UnlockEntryKind } from '../unlock/entry';
import { ConditionRow } from './ConditionRow';
import { ProgressModel } from './progressContent';
export function HomeScreen() {
  useDemoProgress();
  const runtime = useRuntime(),
    router = useRouter(),
    now = useClock(),
    decision = useLockDecision(),
    progress = useTodayProgress(),
    streak = useStreak();
  const name = useProfileStore((s) => s.data.name);
  const { rules, lockedApps } = useRulesStore((s) => s.data),
    permissions = usePermissionsStore((s) => s.data),
    auto = useSettingsStore((s) => s.data.gymAutoDetect),
    session = useRuleDaysStore((s) => s.data.walkingSession);
  const timezone = runtime.clock.timezone();
  const status = statusContent({
      decision,
      rules,
      apps: lockedApps,
      permissions,
      now,
      timezone,
      lastClaimAt: useLastClaimAt(),
    }),
    glyph = useUnlockMoment(status.state);
  const [sheet, setSheet] = useState<{ type: 'walk' | 'checkin'; ruleId: string } | null>(null);
  const chooseApps = () => void runtime.screenTime.presentAppPicker();
  const add = () => router.push('/builder');
  const action = () => {
    if (status.action === 'permission') void runtime.screenTime.requestAuthorization();
    if (status.action === 'apps') chooseApps();
    if (status.action === 'add') add();
    if (status.action === 'conditions') router.navigate('/conditions');
    if (status.action === 'stop') runtime.walking.stop();
    if (status.action === 'plans') router.push('/paywall');
    if (status.action === 'retry') runtime.screenTime.applyLock(decision);
  };
  const actionLabel = status.action
    ? {
        permission: c.fix,
        apps: c.chooseApps,
        add: c.add,
        conditions: c.conditions,
        stop: c.stopWalk,
        plans: c.seePlans,
        retry: c.retry,
      }[status.action]
    : undefined;
  useEffect(() => {
    runtime.analytics.screen('Home');
  }, [runtime]);
  const scheduledRuleId =
    decision.state === 'locked'
      ? decision.nextUnlockHint.ruleId
      : decision.state === 'beforeWindow'
        ? decision.ruleId
        : decision.state === 'unlockedMet'
          ? decision.byRuleId
          : decision.state === 'unlockedWalking'
            ? decision.sessionRuleId
            : undefined;
  const scheduledRule = rules.find((rule) => rule.enabled && rule.id === scheduledRuleId);
  const today = [...progress].sort((a, b) => a.instance.start.localeCompare(b.instance.start));
  const scheduleCard =
    scheduledRule && !['permissionNeeded', 'noAppsSelected'].includes(status.state)
      ? blockingSchedule(today.length ? today.map(({ rule }) => rule) : [scheduledRule], scheduledRule)
      : undefined;
  const metBy =
    decision.state === 'unlockedMet'
      ? { byRuleId: decision.byRuleId, byRuleName: ruleName(rules.find((r) => r.id === decision.byRuleId)!) }
      : undefined;
  const openEntry = (rule: Rule, kind: UnlockEntryKind) =>
    kind === 'handheld'
      ? setSheet({ type: 'walk', ruleId: rule.id })
      : router.push({ pathname: `/unlock/${kind}`, params: { ruleId: rule.id } });
  const takeAction = (rule: Rule, model: ProgressModel) => {
    if (model.action === 'fix') return router.push(`/settings/permission/${sensorFor(rule)}`);
    const kind = unlockEntries(rule)[0];
    if (kind) return openEntry(rule, kind);
    if (model.action) setSheet({ type: model.action, ruleId: rule.id });
  };
  // merge: P2-T20 persists pausedReason, so this list becomes a selector over paused rules.
  const orphaned = scheduleCard ? rules.filter((rule) => !rule.enabled && rule.pausedReason === 'noGym') : [];
  const pausedCards = orphaned.map((rule) => (
    <ConditionRow
      key={rule.id}
      model={{ title: ruleName(rule), icon: rule.activity, value: 0, detail: '' }}
      status={conditionStatus('pausedNoGym')}
      onAction={() => router.push('/settings/gyms')}
    />
  ));
  const conditionCards = today.map(({ rule, row }) => {
    const model = progressContent(rule, row, permissions, session, now, auto, metBy);
    const entries =
      decision.state === 'locked' && decision.activeRuleIds.includes(rule.id) ? unlockEntries(rule) : [];
    return scheduleCard ? (
      <ConditionRow
        key={rule.id}
        model={model}
        status={conditionStatus(conditionState(rule, row, decision, now, timezone))}
        entries={entries}
        onEntry={(kind) => openEntry(rule, kind)}
        onAction={() => takeAction(rule, model)}
      />
    ) : (
      <ProgressCard
        key={rule.id}
        appearance="card"
        title={model.title}
        icon={model.icon}
        value={model.value}
        detail={model.detail}
        action={model.label}
        onAction={() => takeAction(rule, model)}
      />
    );
  });
  return (
    <ScreenShell
      orangeBackground
      safeBottom={false}
      overlay={
        <HomeSheets
          sheet={sheet}
          rules={rules}
          onDismiss={() => setSheet(null)}
          onChooseGym={() => {
            setSheet(null);
            router.push('/settings/gyms');
          }}
        />
      }>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: t.space.md }}>
        <View style={{ flex: 1 }}>
          <Heading
            title={c.greeting(name)}
            support={new Intl.DateTimeFormat('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              timeZone: timezone,
            }).format(new Date(now))}
          />
        </View>
        <StreakBadge count={streak.current} />
      </View>
      {scheduleCard ? (
        <Reveal>
          <BlockingScheduleCard
            {...scheduleCard}
            lock
            nowMinute={dayMinute(now, timezone)}
            glyph={status.icon}
            open={status.unlocked}
            statusTitle={status.title}
            statusSubtitle={status.subtitle}
            caption={status.nextChange}>
            {conditionCards}
            {pausedCards}
          </BlockingScheduleCard>
        </Reveal>
      ) : (
        <StatusCard
          appearance="orange"
          title={status.title}
          subtitle={status.subtitle}
          unlocked={status.unlocked}
          hero={
            <Animated.View style={glyph}>
              <LivingIcon name={status.icon} size={t.space.hero} tint={t.text.onAccent} />
            </Animated.View>
          }
        />
      )}
      {actionLabel ? (
        <Reveal key={status.action}>
          <SecondaryButton label={actionLabel} onPress={action} />
        </Reveal>
      ) : null}
      {!scheduleCard ? conditionCards : null}
      <Reveal>
        <View
          style={{
            backgroundColor: t.surface.card,
            borderRadius: t.radius.pill,
            boxShadow: '0px 6px 20px rgba(100, 55, 25, 0.10)',
          }}>
          <SettingsRow
            title={c.lockedApps}
            value={lockedAppsSummary(lockedApps)}
            icon="lock"
            iconTint={t.brand.primary}
            onPress={chooseApps}
          />
        </View>
      </Reveal>
      <View style={{ gap: t.space.lg }}>
        <SecondaryButton label="Test gym unlock" onPress={() => router.push('/unlock/gym?preview=1')} />
        <SecondaryButton label="Test treadmill unlock" onPress={() => router.push('/unlock/treadmill?preview=1')} />
        <SecondaryButton variant="tertiary" label={c.editAdd} onPress={() => router.navigate('/conditions')} />
        <SecondaryButton label={c.add} onPress={add} />
      </View>
    </ScreenShell>
  );
}
