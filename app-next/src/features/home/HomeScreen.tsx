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
  SettingsGroup,
  SettingsRow,
  StreakBadge,
  SecondaryButton,
  Label,
  BottomSheet,
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
import { pickerCopy } from '../../content/pickers';
import { LivingIcon } from '../../motion/LivingIcon';
import { Reveal } from '../../motion/Reveal';
export function HomeScreen() {
  useDemoProgress();
  const runtime = useRuntime(),
    router = useRouter(),
    now = useClock(),
    decision = useLockDecision(),
    progress = useTodayProgress(),
    streak = useStreak();
  const name = useProfileStore((s) => s.data.name),
    { rules, lockedApps } = useRulesStore((s) => s.data),
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
  const [sheet, setSheet] = useState<'walk' | 'checkin' | null>(null);
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
  return (
    <ScreenShell
      safeBottom={false}
      overlay={
        <BottomSheet
          open={sheet !== null}
          title={sheet === 'walk' ? c.startWalk : c.checkIn}
          onDismiss={() => setSheet(null)}>
          <LivingIcon name={sheet === 'walk' ? 'walking' : 'gym'} />
          <Label>{c.placeholder}</Label>
        </BottomSheet>
      }>
      <Heading
        title={c.greeting(name)}
        support={new Intl.DateTimeFormat('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          timeZone: runtime.clock.timezone(),
        }).format(new Date(now))}
      />
      <StatusCard
        title={status.title}
        subtitle={status.subtitle}
        unlocked={status.unlocked}
        hero={
          <Animated.View style={glyph}>
            <LivingIcon name={status.icon} size={t.space.hero} />
          </Animated.View>
        }
      />
      {actionLabel ? (
        <Reveal key={status.action}>
          <SecondaryButton label={actionLabel} onPress={action} />
        </Reveal>
      ) : null}
      {progress.length ? (
        <Reveal>
          <Label variant="section" accessibilityRole="header">
            {c.today}
          </Label>
        </Reveal>
      ) : null}
      {progress.map(({ rule, row }, index) => {
        const model = progressContent(rule, row, permissions, session, now, auto);
        return (
          <Reveal key={rule.id} index={index}>
            <ProgressCard
              title={model.title}
              icon={model.icon}
              value={model.value}
              detail={model.detail}
              action={'label' in model ? model.label : undefined}
              onAction={() => {
                if ('action' in model) {
                  if (model.action === 'stop') runtime.walking.stop();
                  else if (model.action) setSheet(model.action);
                }
              }}
            />
          </Reveal>
        );
      })}
      <Reveal>
        <SettingsGroup>
          <SettingsRow
            title={c.lockedApps}
            value={pickerCopy.counts(lockedApps.appCount, lockedApps.categoryCount)}
            icon="lock"
            onPress={chooseApps}
          />
        </SettingsGroup>
      </Reveal>
      <View style={{ gap: t.space.lg }}>
        <StreakBadge count={streak.current} />
        <SecondaryButton label={c.add} onPress={add} />
      </View>
    </ScreenShell>
  );
}
