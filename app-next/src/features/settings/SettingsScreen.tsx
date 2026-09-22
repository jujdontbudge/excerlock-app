import { useRef, useState } from 'react';
import { Linking } from 'react-native';
import Constants from 'expo-constants';
import { ScreenShell, Label, PressableScale, SettingsGroup, SettingsRow } from '../../design-system';
import { profileStore as useProfileStore } from '../../state/profileStore';
import { entitlementStore as useEntitlementStore } from '../../state/entitlementStore';
import { settingsStore as useSettingsStore } from '../../state/settingsStore';
import { permissionsStore as usePermissionsStore } from '../../state/permissionsStore';
import { settingsCopy as c } from '../../content/settings';
import { supportCopy as s } from '../../content/support';
import { incidentCopy as i } from '../../content/incident';
import { openSupportEmail } from '../../runtime/SupportDelivery';
import { useRuntime } from '../../runtime/AppRuntimeProvider';

export function SettingsScreen({ navigate, onDev }: { navigate: (path: string) => void; onDev?: () => void }) {
  const name = useProfileStore((s) => s.data.name),
    runtime = useRuntime(),
    entitlement = useEntitlementStore((s) => s.data.entitlement),
    notificationsEnabled = useSettingsStore((s) => s.data.notificationsEnabled),
    notificationStatus = usePermissionsStore((s) => s.data.notifications),
    taps = useRef(0),
    [mailNote, setMailNote] = useState(false);
  // One switch: on means the app wants reminders and iOS allows them.
  const notificationsOn = notificationsEnabled && notificationStatus === 'granted';
  const toggleNotifications = async (on: boolean) => {
    useSettingsStore.getState().patch({ notificationsEnabled: on });
    if (!on || notificationStatus === 'granted') return;
    const status = notificationStatus === 'notDetermined' ? await runtime.notifications.request() : notificationStatus;
    if (status !== 'granted') void Linking.openSettings();
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
            void openSupportEmail().catch(() => setMailNote(true));
          }}
        />
        <SettingsRow title={c.legal} icon="list" onPress={() => navigate('legal')} />
      </SettingsGroup>
      {mailNote ? (
        <Label accessibilityRole="alert" selectable>
          {s.errorWithAddress}
        </Label>
      ) : null}
      <PressableScale
        label={version}
        onPress={() => {
          if (taps.current === 6) {
            taps.current = 0;
            onDev?.();
          } else taps.current += 1;
        }}>
        <Label tone="secondary" style={{ textAlign: 'center' }}>
          {version}
        </Label>
      </PressableScale>
    </ScreenShell>
  );
}
