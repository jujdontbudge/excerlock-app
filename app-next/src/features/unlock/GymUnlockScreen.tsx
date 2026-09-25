import { useEffect, useState } from 'react';
import { Linking, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Heading, Label, PrimaryButton } from '../../design-system';
import { UnlockLockFrame } from '../../design-system/UnlockLockFrame';
import { useRuntime } from '../../ports/useRuntime';
import { rulesStore as useRulesStore } from '../../state/rulesStore';
import { unlockCopy as c } from '../../content/unlock';
import { useGymUnlock } from './useGymUnlock';
import { useCeremony } from './useCeremony';
import { gymUnlockSubline } from './entry';
import { UnlockLayout, Detected } from './UnlockLayout';
import { GymUnlockMap } from './GymUnlockMap';
import { ruleDaysStore as useRuleDaysStore } from '../../state/ruleDaysStore';
import { dayKey } from '../../domain/calendar';
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
    !preview && (met || !!useRuleDaysStore.getState().data.gymPresence?.confirmedAt),
  );
  const state = useGymUnlock(preview, alreadyCredited);
  const window = rule?.schedule.window;
  const minute = window?.kind === 'range' ? window.endMinute : 1439;
  const end = `${Math.floor(minute / 60) % 12 || 12}${minute % 60 ? ':' + String(minute % 60).padStart(2, '0') : ''} ${minute < 720 ? 'AM' : 'PM'}`;
  const subline = gymUnlockSubline(rule, preview && !rule ? '9 PM' : end);
  const ceremony = useCeremony(state.value, state.lifted, c.gym.detected);
  const close = () => {
    runtime.analytics.track('unlock_ceremony_done', { kind: 'gym', preview });
    router.back();
  };
  useEffect(() => {
    runtime.analytics.track('unlock_screen_opened', { kind: 'gym', preview });
  }, [runtime, preview]);
  const noGym = !state.nearest && !preview;
  const outside = !state.denied && !noGym && !state.working && !state.inside;
  const title = state.denied ? c.gym.denied : noGym ? c.gym.noGym : state.working ? c.gym.confirming : c.gym.inside;
  const body = state.denied
    ? c.gym.deniedBody
    : state.working
      ? c.gym.confirmingBody
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
          <>
            {outside ? (
              <Label accessibilityRole="alert" variant="support" tone="secondary" style={{ textAlign: 'center' }}>
                {state.checking ? c.gym.checking : c.gym.outside}
              </Label>
            ) : null}
            <PrimaryButton
              label={c.gym.unlock}
              loading={state.working || state.checking}
              disabled={state.working || state.checking}
              onPress={() => void state.unlock()}
            />
          </>
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
      {!ceremony.showMessage && !outside ? <Heading title={title} support={body} /> : null}
      {state.error ? <Label accessibilityRole="alert">{state.error}</Label> : null}
    </UnlockLayout>
  );
}
