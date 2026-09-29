import { useEffect, useRef, useState } from 'react';
import { Linking, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CloseButton, Heading, Label, PressableScale, PrimaryButton, ScreenShell } from '../ui';
import { SetupPresentation } from '../ui/SetupPresentation';
import { tokens as t } from '../ui/tokens';
import { setupCopy as c } from './lib/setupCopy';
import { needBlocked, type SetupNeed } from '../permissions/setupNeeds';
import { LivingIcon } from '../ui/LivingIcon';
import { useRuntime } from '../ports/useRuntime';
import { ScreenTimeAuthorizationError } from '../app-selection/ScreenTimeAuthorizationError';
import { permissionsStore } from '../permissions/permissionsStore';
import { useLaunchSignIn } from '../identity/launchSignInGate';
import { PermissionGuide } from './lib/PermissionGuide';
import { systemAlert } from '../permissions/systemAlerts';
import { SignInScreen } from '../identity/SignInScreen';
import { needCopyKey, useSetupNeeds } from '../permissions/useSetupNeeds';

export type SetupStep = 'account' | SetupNeed;
type Step = SetupStep;

export function SetupFlow({
  account,
  onDone,
  onClose,
  onStep,
}: {
  account: boolean;
  onDone: () => void;
  onClose?: () => void;
  onStep?: (step: Step) => void;
}) {
  const runtime = useRuntime(),
    router = useRouter(),
    launchApproved = useLaunchSignIn(runtime.auth),
    { needs, location, permissions } = useSetupNeeds(),
    [passed, setPassed] = useState<Step[]>([]),
    [upgradeRefused, setUpgradeRefused] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const steps: Step[] = [...(account && !launchApproved ? (['account'] as const) : []), ...needs],
    current = steps.find((step) => !passed.includes(step));
  const finished = useRef(false);
  useEffect(() => {
    if (current || finished.current) return;
    finished.current = true;
    onDone();
  }, [current, onDone]);
  useEffect(() => {
    if (current) onStep?.(current);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs only when the step changes
  }, [current]);
  const pass = (step: Step) => {
    setError('');
    setPassed((list) => [...list, step]);
  };
  if (!current) return <ScreenShell>{null}</ScreenShell>;
  if (current === 'account')
    return (
      <ScreenShell header={<Header onClose={onClose} />}>
        <SetupPresentation>
          <SignInScreen onContinue={() => pass('account')} signInRequired={true} requireFreshSignIn />
        </SetupPresentation>
      </ScreenShell>
    );
  const need = current,
    copy = c.flow[needCopyKey(need, location)],
    settings = needBlocked(need, permissions) || (need === 'location' && upgradeRefused);
  const track = (permission: 'screen_time' | 'motion' | 'location', granted: boolean) =>
    runtime.analytics.track('permission_resolved', { permission, outcome: granted ? 'granted' : 'denied' });
  const ask = async () => {
    if (need === 'gym') return router.push('/gym-picker');
    setBusy(true);
    setError('');
    try {
      if (need === 'apps') {
        const apps = await runtime.screenTime.presentAppPicker();
        track('screen_time', true);
        if (!apps.isEmpty) pass('apps');
      } else if (need === 'motion') {
        track('motion', (await runtime.steps.request()) === 'granted');
        pass('motion');
      } else if (location === 'always') {
        const before = permissionsStore.getState().data.location,
          after = await runtime.gym.requestBackgroundLocation();
        track('location', after === 'always');
        if (after === 'whenInUse' && before === 'whenInUse') setUpgradeRefused(true);
        else pass('location');
      } else {
        const after = await runtime.gym.requestLocation();
        track('location', after === 'whenInUse' || after === 'always');
        pass('location');
      }
    } catch (caught) {
      if (caught instanceof ScreenTimeAuthorizationError) {
        track('screen_time', false);
        pass('apps');
      } else setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(false);
    }
  };
  const alert =
    need === 'gym' || settings
      ? null
      : systemAlert(need === 'apps' ? 'screenTime' : need, location === 'always', permissions.location);
  return (
    <ScreenShell
      scrollResetKey={need}
      header={<Header onClose={onClose} skip={busy ? undefined : () => pass(need)} />}
      overlay={alert ? <PermissionGuide key={alert.title + alert.message} alert={alert} /> : null}
      footer={
        <PrimaryButton
          label={settings ? c.settings : copy.action}
          loading={busy}
          onPress={settings ? () => void Linking.openSettings() : () => void ask()}
        />
      }>
      <View key={need} style={alert ? { gap: t.space.xl } : { flexGrow: 1, justifyContent: 'center', gap: t.space.xl }}>
        <Heading
          title={copy.title}
          support={settings ? copy.blocked : alert ? c.tap(alert.buttons[alert.tap]) : c.flow.gym.body}
          centered
        />
        {alert ? null : <LivingIcon name={settings ? 'gear' : 'map-pin'} />}
        {error ? (
          <Label accessibilityRole="alert" style={{ color: t.state.error, textAlign: 'center' }}>
            {error}
          </Label>
        ) : null}
      </View>
    </ScreenShell>
  );
}

function Header({ onClose, skip }: { onClose?: () => void; skip?: () => void }) {
  return (
    <View
      style={{
        paddingHorizontal: t.layout.page,
        height: t.layout.header,
        flexDirection: 'row',
        alignItems: 'center',
      }}>
      <View style={{ width: t.control.row }}>{onClose ? <CloseButton onPress={onClose} /> : null}</View>
      <View style={{ flex: 1 }} />
      <View style={{ width: t.control.row, alignItems: 'flex-end' }}>
        {skip ? (
          <PressableScale label={c.notNow} onPress={skip}>
            <Label variant="support" tone="secondary">
              {c.notNow}
            </Label>
          </PressableScale>
        ) : null}
      </View>
    </View>
  );
}
