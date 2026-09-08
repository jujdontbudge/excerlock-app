import { HomeSheets } from '../sessions/HomeSheets';
import { BlockingScheduleCard } from '../../design-system/BlockingScheduleCard';
import { blockingSchedule } from './blockingSchedule';
import { ruleName } from '../../domain/ruleName';
import { Icon } from '../../icons/Icon';
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
import { statusContent } from './statusContent';
import { progressContent } from './progressContent';
import { useUnlockMoment } from './useUnlockMoment';
import { homeCopy as c } from '../../content/home';
import { LivingIcon } from '../../motion/LivingIcon';
import { Reveal } from '../../motion/Reveal';
import { unlockKind } from '../unlock/entry';
import { UnlockEntry } from '../unlock/UnlockEntry';
import { hydrationReport as useHydrationReport } from '../../state/hydrationReport';
import { common } from '../../content/common';
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
    session = useRuleDaysStore((s) => s.data.walkingSession);
  const status = statusContent({
      decision,
      rules,
      apps: lockedApps,
      permissions,
      now,
      timezone: runtime.clock.timezone(),
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
  };
  const actionLabel = status.action
    ? { permission: c.fix, apps: c.chooseApps, add: c.add, conditions: c.conditions, stop: c.stopWalk }[status.action]
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
  const scheduleCard =
    scheduledRule && !['permissionNeeded', 'noAppsSelected'].includes(status.state)
      ? blockingSchedule(scheduledRule)
      : undefined;
  const conditionCards = progress.map(({ rule, row }) => {
    const model = progressContent(rule, row, permissions, session, now, auto);
    return (
      <ProgressCard
        key={rule.id}
        appearance={scheduleCard ? 'lock' : 'card'}
        title={model.title}
        icon={model.icon}
        value={model.value}
        detail={model.detail}
        action={'label' in model ? model.label : undefined}
        onAction={() => {
          const kind = unlockKind(rule);
          if (kind) router.push({ pathname: `/unlock/${kind}`, params: { ruleId: rule.id } });
          else if ('action' in model && model.action) setSheet({ type: model.action, ruleId: rule.id });
        }}
      />
    );
  });
  const entryRules =
    decision.state === 'locked'
      ? (['gym', 'treadmill'] as const)
          .map((kind) =>
            progress.find(({ rule }) => decision.activeRuleIds.includes(rule.id) && unlockKind(rule) === kind),
          )
          .filter((entry) => entry !== undefined)
      : [];
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
              timeZone: runtime.clock.timezone(),
            }).format(new Date(now))}
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
            action={
              entryRules.length ? (
                <View style={{ paddingHorizontal: t.space.xl, paddingBottom: t.space.sm, gap: t.space.xs }}>
                  {entryRules.map(({ rule, row }) => (
                    <UnlockEntry
                      key={rule.id}
                      kind={unlockKind(rule)!}
                      label={unlockKind(rule) === 'gym' ? c.gymEntry : c.treadmillEntry}
                      detail={
                        entryRules.length === 1
                          ? progressContent(rule, row, permissions, session, now, auto).detail
                          : undefined
                      }
                      onPress={() =>
                        router.push({ pathname: `/unlock/${unlockKind(rule)!}`, params: { ruleId: rule.id } })
                      }
                    />
                  ))}
                </View>
              ) : undefined
            }>
            {conditionCards}
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
      {scheduleCard && progress.length ? (
        <View style={{ gap: t.space.md }}>
          <View
            style={{
              backgroundColor: t.surface.card,
              borderRadius: t.radius.sheet,
              marginHorizontal: -t.space.sm,
              paddingHorizontal: t.space.xl,
              paddingTop: t.space.lg,
              paddingBottom: 0,
              boxShadow: '0px 6px 20px rgba(100, 55, 25, 0.10)',
            }}>
            <Label variant="section" accessibilityRole="header" style={{ marginBottom: t.space.sm }}>
              {c.today}
            </Label>
            {progress.map(({ rule }) => (
              <View
                key={rule.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: t.space.lg,
                  minHeight: t.layout.button,
                  paddingVertical: t.space.sm,
                  borderBottomWidth: t.stroke.hairline,
                  borderBottomColor: t.border.default,
                }}>
                <Icon name={rule.activity} variant="utility" size={t.space.xxl} tint={t.brand.primary} />
                <Label variant="label" style={{ flex: 1 }}>
                  {ruleName(rule)}
                </Label>
              </View>
            ))}
            <SecondaryButton variant="tertiary" label={c.editAdd} onPress={() => router.navigate('/conditions')} />
          </View>
        </View>
      ) : null}
      {scheduleCard && status.unlocked ? (
        <Label tone="secondary">
          {status.title}. {status.subtitle}
        </Label>
      ) : null}
      {actionLabel ? (
        <Reveal key={status.action}>
          <SecondaryButton label={actionLabel} onPress={action} />
        </Reveal>
      ) : null}
      {!scheduleCard && progress.length ? (
        <Reveal>
          <Label variant="section" accessibilityRole="header">
            {c.today}
          </Label>
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
          <SettingsRow title={c.lockedApps} icon="lock" iconTint={t.brand.primary} onPress={chooseApps} />
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
        {!scheduleCard ? <SecondaryButton label={c.add} onPress={add} /> : null}
      </View>
    </ScreenShell>
  );
}
