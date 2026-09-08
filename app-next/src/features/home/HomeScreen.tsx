import { HomeSheets } from '../sessions/HomeSheets';
import { BlockingScheduleCard } from '../../design-system/BlockingScheduleCard';
import { blockingSchedule } from './blockingSchedule';
import { dayMinute } from './mergedHomeIntervals';
import { dayKey } from '../../domain/calendar';
import { ruleName } from '../../domain/ruleName';
import { conditionState, conditionStatus } from '../../domain/conditionState';
import { useDemoProgress } from './useDemoProgress';
import { useEffect, useState } from 'react';
import { Linking, View } from 'react-native';
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
  Label,
} from '../../design-system';
import { tokens as t } from '../../design-system/tokens';
import { useRuntime } from '../../runtime/AppRuntimeProvider';
import { useClock, useLockDecision, useTodayProgress, useStreak } from '../../state/selectors';
import { profileStore as useProfileStore } from '../../state/profileStore';
import { rulesStore as useRulesStore } from '../../state/rulesStore';
import { permissionsStore as usePermissionsStore } from '../../state/permissionsStore';
import { settingsStore as useSettingsStore } from '../../state/settingsStore';
import { ruleDaysStore as useRuleDaysStore } from '../../state/ruleDaysStore';
import { entitlementStore as useEntitlementStore } from '../../state/entitlementStore';
import { enforcementStore as useEnforcementStore } from '../../state/enforcementStore';
import { statusContent } from './statusContent';
import { progressContent, ProgressModel, sensorFor } from './progressContent';
import { useLastClaimAt } from './claimState';
import { clearHomeWalkingSheetRequest, useHomeWalkingSheetRequest } from './homeSheetRequest';
import { useUnlockMoment } from './useUnlockMoment';
import { homeCopy as c } from '../../content/home';
import { formatDate } from '../../content/locale';
import { settingsCopy } from '../../content/settings';
import { lockedAppsSummary } from '../../content/pickers';
import { common } from '../../content/common';
import { LivingIcon } from '../../motion/LivingIcon';
import { Reveal } from '../../motion/Reveal';
import { Rule } from '../../domain/types';
import { unlockEntries, UnlockEntryKind } from '../unlock/entry';
import { ConditionRow } from './ConditionRow';
import { hydrationReport as useHydrationReport } from '../../state/hydrationReport';
export function HomeScreen() {
  useDemoProgress();
  const runtime = useRuntime(),
    router = useRouter(),
    now = useClock(),
    decision = useLockDecision(),
    progress = useTodayProgress(),
    streak = useStreak();
  const persistenceVisible = useHydrationReport(
      (state) => !state.dismissed && (state.droppedCount > 0 || state.writeErrors.length > 0),
    ),
    persistenceDropped = useHydrationReport((state) => state.droppedCount > 0);
  const name = useProfileStore((s) => s.data.name);
  const { rules, lockedApps } = useRulesStore((s) => s.data),
    permissions = usePermissionsStore((s) => s.data),
    auto = useSettingsStore((s) => s.data.gymAutoDetect),
    session = useRuleDaysStore((s) => s.data.walkingSession),
    entitlement = useEntitlementStore((s) => s.data.entitlement.status),
    enforcement = useEnforcementStore((s) => s.enforcementStatus);
  const timezone = runtime.clock.timezone();
  const status = statusContent({
      decision,
      rules,
      apps: lockedApps,
      permissions,
      now,
      timezone,
      enforcement,
      walkingSession: session,
      lastClaimAt: useLastClaimAt(),
      lapsed: entitlement === 'expired' || entitlement === 'billingIssue',
    }),
    glyph = useUnlockMoment(status.state);
  const [sheet, setSheet] = useState<{ type: 'walk'; ruleId: string } | null>(null);
  const handedOff = useHomeWalkingSheetRequest();
  useEffect(() => {
    if (!handedOff) return;
    setSheet({ type: 'walk', ruleId: handedOff });
    clearHomeWalkingSheetRequest();
  }, [handedOff]);
  const chooseApps = () => void runtime.screenTime.presentAppPicker();
  const add = () => router.push('/builder');
  // iOS never re-presents the Screen Time prompt after a denial, and a restricted
  // device can never grant it, so those two statuses recover through iOS Settings.
  const screenTimeUnaskable = permissions.screenTime === 'denied' || permissions.screenTime === 'restricted';
  const action = () => {
    if (status.action === 'permission')
      screenTimeUnaskable ? void Linking.openSettings() : void runtime.screenTime.requestAuthorization();
    if (status.action === 'apps') chooseApps();
    if (status.action === 'add') add();
    if (status.action === 'conditions') router.navigate('/conditions');
    if (status.action === 'stop') runtime.walking.stop();
    if (status.action === 'plans') router.push('/paywall');
    // The host owns applying the lock; Home only asks it to try again.
    if (status.action === 'retry') useEnforcementStore.getState().retry();
  };
  const actionLabel = status.action
    ? status.action === 'permission' && screenTimeUnaskable
      ? settingsCopy.openSettings
      : {
          permission: c.fix,
          apps: c.chooseApps,
          add: c.add,
          conditions: c.conditions,
          stop: c.stopWalk,
          plans: c.seePlans,
          retry: c.tryAgain,
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
    scheduledRule && !['permissionNeeded', 'noAppsSelected', 'enforcementFailed', 'lapsed'].includes(status.state)
      ? blockingSchedule(
          today.length ? today.map(({ rule }) => rule) : [scheduledRule],
          scheduledRule,
          dayKey(now, timezone),
          timezone,
        )
      : undefined;
  const metBy =
    decision.state === 'unlockedMet' ? { byRuleId: decision.byRuleId, byRuleName: decision.byName } : undefined;
  const openEntry = (rule: Rule, kind: UnlockEntryKind) =>
    kind === 'handheld'
      ? setSheet({ type: 'walk', ruleId: rule.id })
      : router.push({ pathname: `/unlock/${kind}`, params: { ruleId: rule.id } });
  const takeAction = (rule: Rule, model: ProgressModel) => {
    if (model.action === 'fix') return router.push(`/settings/permission/${sensorFor(rule)}`);
    const kind = unlockEntries(rule)[0];
    if (kind) return openEntry(rule, kind);
    if (model.action === 'walk') setSheet({ type: 'walk', ruleId: rule.id });
  };
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
    // The pills under a row are that rule's ceremonies, so the card's own pill would repeat one of
    // them; only a permission fix still belongs beside them.
    const rowModel = entries.length && model.action !== 'fix' ? { ...model, label: undefined } : model;
    return scheduleCard ? (
      <ConditionRow
        key={rule.id}
        model={rowModel}
        status={conditionStatus(conditionState(rule, row, decision, now, timezone, model.action === 'fix'))}
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
        <HomeSheets sheet={sheet} rules={rules} onDismiss={() => setSheet(null)} />
      }>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: t.space.md }}>
        <View style={{ flex: 1 }}>
          <Heading
            title={c.greeting(name)}
            support={formatDate(now, { weekday: 'long', month: 'long', day: 'numeric', timeZone: timezone })}
          />
        </View>
        <StreakBadge count={streak.current} />
      </View>
      {persistenceVisible ? (
        <View
          style={{
            gap: t.space.sm,
            padding: t.space.lg,
            borderRadius: t.radius.card,
            backgroundColor: t.surface.card,
          }}>
          <Label accessibilityRole="alert">
            {persistenceDropped ? common.persistenceNotice.unreadable : common.persistenceNotice.unsaved}
          </Label>
          <SecondaryButton
            variant="tertiary"
            label={common.persistenceNotice.dismiss}
            onPress={useHydrationReport.getState().dismiss}
          />
        </View>
      ) : null}
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
        <View
          style={{
            backgroundColor: t.surface.card,
            borderRadius: t.radius.pill,
            boxShadow: '0px 6px 20px rgba(100, 55, 25, 0.10)',
          }}>
          <SettingsRow
            title={c.analytics}
            icon="chart"
            iconTint={t.brand.primary}
            onPress={() => router.navigate('/analytics')}
          />
        </View>
        <View
          style={{
            backgroundColor: t.surface.card,
            borderRadius: t.radius.pill,
            boxShadow: '0px 6px 20px rgba(100, 55, 25, 0.10)',
          }}>
          <SettingsRow title={c.history} icon="clock" iconTint={t.brand.primary} />
        </View>
        <SecondaryButton variant="tertiary" label={c.editAdd} onPress={() => router.navigate('/conditions')} />
        <SecondaryButton label={c.add} onPress={add} />
      </View>
    </ScreenShell>
  );
}
