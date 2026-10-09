import { useRef } from 'react';
import { Linking } from 'react-native';
import Constants from 'expo-constants';
import { ScreenShell, Label, PressableScale, SettingsGroup, SettingsRow } from '../ui';
import { notify } from '../ui/Notice';
import { profileStore as useProfileStore } from '../preferences/profileStore';
import { entitlementStore as useEntitlementStore } from '../subscription/entitlementStore';
import { settingsStore as useSettingsStore } from '../preferences/settingsStore';
import { permissionsStore as usePermissionsStore } from '../permissions/permissionsStore';
import { settingsCopy as c } from './lib/settingsCopy';
import { supportCopy as s } from '../support/supportCopy';
import { incidentCopy as i } from '../support/incidentCopy';
import { openSupportEmail } from '../support/SupportDelivery';
import { useRuntime } from '../ports/useRuntime';
import { haptic } from '../ui/haptics';
import { toggleFilmingMode, useFilmingModeActive } from '../activity/filmingModeStore';
import { toggleShowcaseMode, useShowcaseMode } from '../progress/showcaseModeStore';

export function SettingsScreen({ navigate, onDev }: { navigate: (path: string) => void; onDev?: () => void }) {
  const name = useProfileStore((s) => s.data.name),
    runtime = useRuntime(),
    entitlement = useEntitlementStore((s) => s.data.entitlement),
    notificationsEnabled = useSettingsStore((s) => s.data.notificationsEnabled),
    notificationStatus = usePermissionsStore((s) => s.data.notifications),
    filming = useFilmingModeActive(),
    showcase = useShowcaseMode(),
    taps = useRef(0);
  const notificationsOn = notificationsEnabled && notificationStatus === 'granted';
  const toggleNotifications = async (on: boolean) => {
    useSettingsStore.getState().patch({ notificationsEnabled: on });
    if (!on || notificationStatus === 'granted') return;
    const status = notificationStatus === 'notDetermined' ? await runtime.notifications.request() : notificationStatus;
    if (status === 'granted') haptic('success');
    else void Linking.openSettings();
  };
  const toggleFilming = () => {
    const on = toggleFilmingMode(Date.now());
    haptic(on ? 'success' : 'tap');
    notify(on ? c.filmingOn : c.filmingOff);
  };
  const toggleShowcase = () => {
    const on = toggleShowcaseMode(runtime.auth);
    if (on === null) return;
    haptic(on ? 'success' : 'tap');
    notify(on ? c.showcaseOn : c.showcaseOff);
  };
  const version = c.version(Constants.expoConfig?.version ?? '1.0.0', Constants.expoConfig?.ios?.buildNumber ?? '1');
  return (
    <ScreenShell dock safeBottom={false}>
      <Label accessibilityRole="header" variant="display">
        {c.title}
      </Label>
      <SettingsGroup>
        <SettingsRow title={name || c.account} icon="person" onPress={() => navigate('account')} />
      </SettingsGroup>
      <SettingsGroup>
        <SettingsRow
          title={c.manage}
          subtitle={c.plan(entitlement.status)}
          icon="lock"
          onPress={() => navigate('subscription')}
        />
        <SettingsRow title={c.preferences} icon="gear" onPress={() => navigate('preferences')} />
        <SettingsRow
          title={c.notificationsToggle}
          icon="bell"
          toggle={notificationsOn}
          onToggle={(on) => void toggleNotifications(on)}
        />
      </SettingsGroup>
      <SettingsGroup>
        <SettingsRow title={i.row} subtitle={i.rowBody} icon="info" onPress={() => navigate('report')} />
        <SettingsRow title={c.giveFeedback} icon="star" onPress={() => navigate('feedback')} />
        <SettingsRow
          title={c.supportRow}
          icon="mail"
          onPress={() => {
            void openSupportEmail().catch(() => notify(s.emailUs));
          }}
        />
        <SettingsRow title={c.legal} icon="list" onPress={() => navigate('legal')} />
      </SettingsGroup>
      <PressableScale
        label={version}
        delayLongPress={1500}
        onLongPress={toggleShowcase}
        onPress={() => {
          if (taps.current === 6) {
            taps.current = 0;
            if (onDev) onDev();
            else toggleFilming();
          } else taps.current += 1;
        }}>
        <Label tone="secondary" style={{ textAlign: 'center' }}>
          {version}
        </Label>
      </PressableScale>
      {filming ? (
        <Label tone="secondary" style={{ textAlign: 'center' }}>
          {c.filmingActive}
        </Label>
      ) : null}
      {showcase ? (
        <Label tone="secondary" style={{ textAlign: 'center' }}>
          {c.showcaseActive}
        </Label>
      ) : null}
    </ScreenShell>
  );
}
