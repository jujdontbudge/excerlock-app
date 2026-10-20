import { useEffect, useRef, useState } from 'react';
import { Linking, View } from 'react-native';
import { Heading, Label, PrimaryButton, SystemAlert } from '../ui';
import { notify } from '../ui/Notice';
import { useRuntime } from '../ports/useRuntime';
import { permissionsStore as usePermissionsStore } from './permissionsStore';
import { permissionDetailCopy as c } from './permissionDetailsCopy';
import { systemAlert } from './systemAlerts';
import { settingsStore } from '../preferences/settingsStore';
import { Permissions } from '../model/types';
import { LivingIcon } from '../ui/LivingIcon';
import { IconName } from '../ui/Icon';
import { reportRuntimeError } from '../telemetry/reportRuntimeError';
export const permissionIcons: Record<keyof Permissions, IconName> = {
  screenTime: 'shield',
  motion: 'walking',
  location: 'map-pin',
  camera: 'person',
  notifications: 'bell',
};
export function PermissionDetail({ name, onDone }: { name: keyof Permissions; onDone: () => void }) {
  const runtime = useRuntime();
  const status = usePermissionsStore((s) => s.data[name]);
  const [busy, setBusy] = useState(false);
  const [pageStatus, setPageStatus] = useState(status);
  const locked = useRef(false);
  useEffect(() => { if (!locked.current) setPageStatus(status); }, [status]);
  const upgrade = name === 'location' && pageStatus === 'whenInUse';
  const settings = pageStatus === 'denied' || pageStatus === 'restricted' || (upgrade && settingsStore.getState().data.locationAlwaysAsked);
  const unanswered = pageStatus === 'notDetermined' || (upgrade && !settings);
  const alert = unanswered ? systemAlert(name, upgrade, usePermissionsStore.getState().data.location) : null;
  const ask = async () => {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    try {
      if (settings) {
        if (name === 'screenTime' && await runtime.screenTime.requestAuthorization() === 'granted') onDone();
        else await Linking.openSettings();
        return;
      }
      if (unanswered) {
        if (name === 'screenTime') await runtime.screenTime.requestAuthorization();
        else if (name === 'motion') await runtime.steps.request();
        else if (name === 'location') {
          if (upgrade) {
            await runtime.gym.requestBackgroundLocation();
            settingsStore.getState().patch({ locationAlwaysAsked: true });
          } else await runtime.gym.requestLocation();
        } else if (name === 'notifications') await runtime.notifications.request();
        else usePermissionsStore.getState().patch({ camera: await runtime.gait.permission() });
      }
      onDone();
    } catch (error) {
      reportRuntimeError(error);
      if (usePermissionsStore.getState().data[name] === 'denied') onDone();
      else notify(c.retry);
    } finally {
      locked.current = false;
      setBusy(false);
      setPageStatus(usePermissionsStore.getState().data[name]);
    }
  };
  return (
    <>
      <Heading title={c.permissionNames[name]} support={c.why[name]} />
      {alert ? <View style={{ alignItems: 'center' }}><SystemAlert alert={alert} guide onPress={() => void ask()} /></View> : <LivingIcon name={permissionIcons[name]} />}
      {unanswered || settings ? <Label tone="secondary">{c.without[name]}</Label> : null}
      <PrimaryButton label={settings ? c.openSettings : unanswered ? c.continue : c.done} loading={busy} onPress={() => void ask()} />
    </>
  );
}
