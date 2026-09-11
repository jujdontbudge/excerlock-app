import { HomeSheets } from '../sessions/HomeSheets';
import { HomeLockStatus } from './HomeLockStatus';
import { ProgressBar } from '../../design-system/ProgressBar';
import { scheduleLabel } from '../../domain/scheduleLabel';
import { Icon } from '../../icons/Icon';
import { useDemoProgress } from './useDemoProgress';
import { useEffect, useState } from 'react';
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
import { Reveal } from '../../motion/Reveal';
import { unlockKind } from '../unlock/entry';
import { UnlockEntry } from '../unlock/UnlockEntry';
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
    session = useRuleDaysStore((s) => s.data.walkingSession),
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
  const conditionCards = progress.map(({ rule, row }) => {
    const model = progressContent(rule, row, permissions, session, now, auto);
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
        : walk === 'walking'
          ? { label: c.walkDetected, tone: 'success' }
          : walk === 'verifying'
            ? { label: c.detectingWalk, tone: 'primary' }
            : walk === 'grace'
              ? { label: c.keepWalking, tone: 'primary' }
              : { label: active ? c.inProgress : c.scheduled, tone: 'primary' };
    const detected = status.tone === 'success';
    const onAction = () => {
      if (kind) router.push({ pathname: `/unlock/${kind}`, params: { ruleId: rule.id } });
      else if ('action' in model && model.action) setSheet({ type: model.action, ruleId: rule.id });
    };
    const onWalk = async () => {
      if (walk === 'idle') {
        try {
          await runtime.walking.start(rule);
        } catch {
          return;
        }
      }
      setSheet({ type: 'walk', ruleId: rule.id });
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
          <Label variant="support" tone="secondary">{`${Math.round(Math.max(0, Math.min(1, model.value)) * 100)}%`}</Label>
        </View>
        <Label variant="label">{model.detail}</Label>
        <ProgressBar value={Math.max(0, Math.min(1, model.value))} label={model.title} tone={detected ? 'success' : 'brand'} />
        {row.met ? null : rule.mode.kind === 'state' ? (
          <>
            <UnlockEntry kind="walking" label={'label' in model && model.label ? model.label : c.walkingEntry} onPress={() => void onWalk()} inverted />
            {kind === 'treadmill' && walk === 'idle' ? <UnlockEntry kind="treadmill" label={c.treadmillEntry} onPress={onAction} /> : null}
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
      orangeBackground
      safeBottom={false}
      scrollUnderStatusBar={false}
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
        <View style={{ flex: 1, gap: t.space.xs }}>
          <Label variant="question" accessibilityRole="header">
            {c.greeting(name)}
          </Label>
        </View>
        <StreakBadge count={streak.current} />
      </View>
      <Animated.View style={glyph}>
        <HomeLockStatus unlocked={status.unlocked} subtitle={status.unlocked ? `${status.title}. ${status.subtitle}` : 'Complete a condition to unlock'} />
      </Animated.View>
      {actionLabel ? <SecondaryButton label={actionLabel} onPress={action} /> : null}
      <View style={{ gap: t.space.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Label variant="section" accessibilityRole="header">{c.today}</Label>
          <SecondaryButton variant="tertiary" label={c.editAdd} onPress={() => router.navigate('/conditions')} />
        </View>
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
          <SettingsRow title={c.lockedApps} icon="lock" iconTint={t.brand.primary} onPress={chooseApps} />
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
        <View
          style={{
            backgroundColor: t.surface.card,
            borderRadius: t.radius.pill,
            borderWidth: t.stroke.hairline,
            borderColor: t.border.outline,
          }}>
          <SettingsRow title={c.history} icon="clock" iconTint={t.brand.primary} />
        </View>
        {!progress.length ? <SecondaryButton label={c.add} onPress={add} /> : null}
      </View>
    </ScreenShell>
  );
}
