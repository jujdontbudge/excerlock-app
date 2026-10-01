import { useEffect, useRef, useState } from 'react';
import { Linking, View } from 'react-native';
import { useIsFocused, useRouter } from 'expo-router';
import { CloseButton, Heading, Label, PressableScale, PrimaryButton, ScreenShell, SecondaryButton, SettingsGroup, SettingsRow } from '../ui';
import { notify } from '../ui/Notice';
import { SetupPresentation } from '../ui/SetupPresentation';
import { tokens as t } from '../ui/tokens';
import { setupCopy as c } from './lib/setupCopy';
import { needBlocked, type SetupNeed } from '../permissions/setupNeeds';
import { LivingIcon } from '../ui/LivingIcon';
import { useRuntime } from '../ports/useRuntime';
import { ScreenTimeAuthorizationError } from '../app-selection/ScreenTimeAuthorizationError';
import { permissionsStore } from '../permissions/permissionsStore';
import { settingsStore } from '../preferences/settingsStore';
import { rulesStore } from '../conditions/rulesStore';
import { useLaunchSignIn } from '../identity/launchSignInGate';
import { PermissionGuide } from './lib/PermissionGuide';
import { systemAlert } from '../permissions/systemAlerts';
import { SignInScreen } from '../identity/SignInScreen';
import { needCopyKey, useSetupNeeds } from '../permissions/useSetupNeeds';

export type SetupStep = 'account' | 'screenTime' | 'locationAlways' | SetupNeed;

export function SetupFlow({ account, onDone, onClose, onStep }: {
  account: boolean;
  onDone: () => void;
  onClose?: () => void;
  onStep?: (step: SetupStep) => void;
}) {
  const focused = useIsFocused();
  const runtime = useRuntime(), AppPickerHost = runtime.appPickerHost, router = useRouter(), launchApproved = useLaunchSignIn(runtime.auth);
  const { needs, location, permissions } = useSetupNeeds();
  const [steps] = useState<SetupStep[]>(() => [
    ...(account && !launchApproved ? ['account' as const] : []),
    ...needs.flatMap((need): SetupStep[] => {
      if (need === 'apps') return permissions.screenTime === 'granted' ? ['apps'] : ['screenTime', 'apps'];
      if (need === 'location' && permissions.location === 'denied') return ['location'];
      if (need === 'location' && location === 'always')
        return permissions.location === 'whenInUse' ? ['locationAlways'] : ['location', 'locationAlways'];
      return [need];
    }),
  ]);
  const [passed, setPassed] = useState<SetupStep[]>([]), [busy, setBusy] = useState(false);
  const [pagePermissions, setPagePermissions] = useState(permissions);
  const [summary, setSummary] = useState(() => runtime.screenTime.selectionSummary());
  const current = steps.find((step) => !passed.includes(step) && (step !== 'gym' || needs.includes('gym')));
  const locked = useRef(false), finished = useRef(false);
  const pass = (...done: SetupStep[]) => {
    setPagePermissions(permissionsStore.getState().data);
    setPassed((list) => [...new Set([...list, ...done])]);
  };
  useEffect(() => permissionsStore.subscribe((state) => {
    if (!locked.current) setPagePermissions(state.data);
  }), []);
  useEffect(() => {
    if (!focused || current || finished.current) return;
    finished.current = true;
    onDone();
  }, [focused, current, onDone]);
  useEffect(() => {
    if (current) onStep?.(current);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs only when the page changes
  }, [current]);
  if (!current) return <ScreenShell>{null}</ScreenShell>;
  if (current === 'account') return (
    <ScreenShell header={<Header onClose={onClose} />}>
      <SetupPresentation><SignInScreen onContinue={() => pass('account')} signInRequired requireFreshSignIn /></SetupPresentation>
    </ScreenShell>
  );
  const need = current;
  const permissionNeed = need === 'screenTime' ? 'apps' : need === 'locationAlways' ? 'location' : need;
  const copy = c.flow[need === 'screenTime' ? 'screenTime' : needCopyKey(permissionNeed, location)];
  const settings = needBlocked(permissionNeed, pagePermissions) || (need === 'locationAlways' && settingsStore.getState().data.locationAlwaysAsked && pagePermissions.location !== 'always');
  const track = (permission: 'screen_time' | 'motion' | 'location', granted: boolean) =>
    runtime.analytics.track('permission_resolved', { permission, outcome: granted ? 'granted' : 'denied' });
  const ask = async () => {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    try {
      if (settings) { await Linking.openSettings(); return; }
      if (need === 'gym') { router.push('/gym-picker'); return; }
      if (need === 'screenTime') {
        const status = await runtime.screenTime.requestAuthorization();
        track('screen_time', status === 'granted');
        pass(...(status === 'granted' ? ['screenTime' as const] : ['screenTime' as const, 'apps' as const]));
      } else if (need === 'apps') {
        await runtime.screenTime.presentAppPicker();
        setSummary(runtime.screenTime.selectionSummary());
      } else if (need === 'motion') {
        track('motion', (await runtime.steps.request()) === 'granted');
        pass('motion');
      } else if (need === 'locationAlways') {
        const after = await runtime.gym.requestBackgroundLocation();
        settingsStore.getState().patch({ locationAlwaysAsked: true });
        track('location', after === 'always');
        if (after !== 'always') notify(c.flow.walkLocation.blocked);
        pass('locationAlways');
      } else {
        const after = await runtime.gym.requestLocation();
        const granted = after === 'whenInUse' || after === 'always';
        track('location', granted);
        pass(...(granted && after !== 'always' ? ['location' as const] : ['location' as const, 'locationAlways' as const]));
      }
    } catch (caught) {
      if (caught instanceof ScreenTimeAuthorizationError) {
        track('screen_time', false);
        pass('screenTime', 'apps');
      } else notify(c.retry);
    } finally {
      locked.current = false;
      setBusy(false);
    }
  };
  const alert = need === 'gym' || need === 'apps' || settings ? null
    : systemAlert(need === 'screenTime' ? 'screenTime' : need === 'motion' ? 'motion' : 'location', need === 'locationAlways', pagePermissions.location);
  const selected = !rulesStore.getState().data.lockedApps.isEmpty;
  const skip = () => { if (!locked.current) pass(...(need === 'screenTime' ? ['screenTime' as const, 'apps' as const] : [need])); };
  return (
    <ScreenShell scrollResetKey={need}
      header={<Header onClose={onClose ? () => { if (!locked.current) onClose(); } : undefined} skip={skip} />}
      overlay={<>{alert ? <PermissionGuide key={need} alert={alert} onPress={() => void ask()} /> : null}{focused && AppPickerHost ? <AppPickerHost /> : null}</>}
      footer={need === 'apps' && !settings ? (
        <View style={{ gap: t.space.md }}>
          {selected ? <SecondaryButton label={c.change} loading={busy} onPress={() => void ask()} /> : null}
          <PrimaryButton label={selected ? c.continue : c.choose} loading={busy} onPress={selected ? () => { if (!locked.current) pass('apps'); } : () => void ask()} />
        </View>
      ) : <PrimaryButton label={settings ? c.settings : copy.action} loading={busy} onPress={() => void ask()} />}>
      <View key={need} style={alert ? { gap: t.space.xl } : { flexGrow: 1, justifyContent: 'center', gap: t.space.xl }}>
        <Heading title={copy.title} support={settings ? copy.blocked : alert ? c.tap(alert.buttons[alert.tap]) : need === 'apps' ? c.chooseBody : c.flow.gym.body} centered />
        {alert ? null : need === 'apps' && !settings ? (
          <View style={{ gap: t.space.lg }}>
            <LivingIcon name="lock" />
            {selected ? <SettingsGroup><SettingsRow title={c.selected} value={summary ? c.summary(summary.applicationCount, summary.categoryCount, summary.webDomainCount) : undefined} /></SettingsGroup> : null}
            <Label variant="support" tone="secondary" style={{ textAlign: 'center' }}>{c.privacy}</Label>
          </View>
        ) : <LivingIcon name={settings ? 'gear' : 'map-pin'} />}
      </View>
    </ScreenShell>
  );
}

function Header({ onClose, skip }: { onClose?: () => void; skip?: () => void }) {
  return <View style={{ paddingHorizontal: t.layout.page, height: t.layout.header, flexDirection: 'row', alignItems: 'center', gap: t.space.lg }}>
    {onClose ? <CloseButton onPress={onClose} /> : null}
    {skip ? <PressableScale label={c.notNow} onPress={skip}><Label variant="support" tone="secondary">{c.notNow}</Label></PressableScale> : null}
    <View style={{ flex: 1 }} />
  </View>;
}
