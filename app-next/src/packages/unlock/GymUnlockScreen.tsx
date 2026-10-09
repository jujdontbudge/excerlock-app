import { useEffect, useState } from 'react';
import { Linking, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Heading, PrimaryButton, Label } from '../ui';
import { UnlockLockFrame } from './lib/UnlockLockFrame';
import { useRuntime } from '../ports/useRuntime';
import { rulesStore as useRulesStore } from '../conditions/rulesStore';
import { unlockCopy as c } from './lib/unlockCopy';
import { PRESENCE_CONFIRM_MS, useGymUnlock } from './lib/useGymUnlock';
import { useCeremony } from './lib/useCeremony';
import { gymUnlockSubline } from './entry';
import { UnlockLayout, Detected } from './lib/UnlockLayout';
import { GymUnlockMap } from './lib/GymUnlockMap';
import { ruleDaysStore as useRuleDaysStore } from '../conditions/ruleDaysStore';
import { permissionsStore as usePermissionsStore } from '../permissions/permissionsStore';
import { dayKey } from '../schedule/calendar';
import { gymCreditFloor } from '../progress/gymCreditFloor';
import type { GymPresence, Rule } from '../model/types';
const gymPresenceCredits = (presence: GymPresence | null, rule: Rule) =>
  !!presence?.confirmedAt && Date.parse(presence.confirmedAt) >= gymCreditFloor(rule);
export function GymUnlockScreen({ ruleId, preview = false }: { ruleId?: string; preview?: boolean }) {
  const router = useRouter(),
    runtime = useRuntime();
  const rule = useRulesStore((s) => s.data.rules.find((r) => r.id === ruleId));
  const met = useRuleDaysStore((s) =>
    s.data.days.some(
      (d) => d.ruleId === ruleId && d.day === dayKey(runtime.clock.now(), runtime.clock.timezone()) && d.met,
    ),
  );
  const [alreadyCredited] = useState(
    !preview && (met || (!!rule && gymPresenceCredits(useRuleDaysStore.getState().data.gymPresence, rule))),
  );
  const state = useGymUnlock(preview, alreadyCredited);
  const window = rule?.schedule.window;
  const minute = window?.kind === 'range' ? window.endMinute : 1439;
  const end = `${Math.floor(minute / 60) % 12 || 12}${minute % 60 ? ':' + String(minute % 60).padStart(2, '0') : ''} ${minute < 720 ? 'AM' : 'PM'}`;
  const subline = gymUnlockSubline(rule, preview && !rule ? '9 PM' : end);
  const ceremony = useCeremony(state.value, state.lifted, c.gym.detected, { fillMs: PRESENCE_CONFIRM_MS });
  const close = () => {
    runtime.analytics.track('unlock_ceremony_done', { kind: 'gym', preview });
    router.back();
  };
  useEffect(() => {
    runtime.analytics.track('unlock_screen_opened', { kind: 'gym', preview });
  }, [runtime, preview]);
  const locationPermission = usePermissionsStore((s) => s.data.location);
  const noGym = !state.nearest && !preview;
  const outside = !state.denied && !noGym && !state.working && !state.inside;
  const title = state.retrying ? c.gym.betterFix : state.denied
    ? c.gym.denied
    : noGym
      ? c.gym.noGym
      : state.working
        ? c.gym.confirming
        : outside
          ? c.gym.outside
          : c.gym.inside;
  const body = state.denied
    ? c.gym.deniedBody
    : state.working
      ? c.gym.confirmingBody
      : outside
        ? c.gym.outsideBody
        : state.inside
          ? c.gym.insideBody(state.nearest?.name ?? 'your gym')
          : undefined;
  return (
    <UnlockLayout
      close={close}
      preview={preview}
      footer={
        ceremony.done ? (
          <PrimaryButton label={c.done} onPress={close} />
        ) : state.lifted ? undefined : state.denied ? (
          <PrimaryButton label={c.gym.openSettings} onPress={() => void Linking.openSettings()} />
        ) : noGym ? (
          <PrimaryButton label={c.gym.chooseGym} onPress={() => router.push('/settings/gyms')} />
        ) : (
          <PrimaryButton
            label={c.gym.unlock}
            loading={state.working || state.checking}
            onPress={() => void state.unlock()}
          />
        )
      }>
      <View
        accessibilityRole="progressbar"
        accessibilityLabel="Presence check"
        accessibilityValue={{ min: 0, max: 100, now: Math.round(state.value * 100) }}>
        <UnlockLockFrame
          celebrate={!alreadyCredited}
          progress={ceremony.progress}
          phase={state.lifted ? 'lifted' : state.working ? 'working' : 'idle'}
          surface={<GymUnlockMap location={state.location} gym={state.nearest} inside={state.inside} />}
          overlay={ceremony.showMessage ? <Detected title={c.gym.detected} body={subline} /> : undefined}
        />
      </View>
      {!preview && locationPermission === 'whenInUse' && !ceremony.showMessage ? <Label variant="support" tone="secondary">{c.gym.foregroundOnly}</Label> : null}
      {!ceremony.showMessage ? <Heading title={title} support={body} /> : null}
    </UnlockLayout>
  );
}
