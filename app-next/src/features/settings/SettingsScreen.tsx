import { useRef, useState } from 'react';
import Constants from 'expo-constants';
import { ScreenShell, Label, PressableScale } from '../../design-system';
import { CompactGroup, CompactRow } from '../../design-system/CompactGroup';
import { profileStore as useProfileStore } from '../../state/profileStore';
import { entitlementStore as useEntitlementStore } from '../../state/entitlementStore';
import { permissionsStore as usePermissionsStore } from '../../state/permissionsStore';
import { settingsCopy as c } from '../../content/settings';
import { supportCopy as s } from '../../content/support';
import { openSupportEmail } from '../../runtime/SupportDelivery';

export function SettingsScreen({ navigate, onDev }: { navigate: (path: string) => void; onDev: () => void }) {
  const name = useProfileStore((s) => s.data.name),
    entitlement = useEntitlementStore((s) => s.data.entitlement),
    notifications = usePermissionsStore((s) => s.data.notifications),
    taps = useRef(0),
    [mailNote, setMailNote] = useState(false);
  const version = c.version(Constants.expoConfig?.version ?? '1.0.0', Constants.expoConfig?.ios?.buildNumber ?? '1');
  const notificationsOn = ['granted', 'always', 'whenInUse'].includes(notifications);
  return (
    <ScreenShell dock safeBottom={false} contentStyle={{ paddingHorizontal: 20, paddingTop: 4, gap: 8 }}>
      <Label accessibilityRole="header" variant="hero" style={{ paddingHorizontal: 8 }}>
        {c.title}
      </Label>
      <CompactGroup>
        <CompactRow
          title={name || c.account}
          subtitle={c.accountPrivacy}
          icon="person"
          onPress={() => navigate('account')}
        />
      </CompactGroup>
      <CompactGroup>
        <CompactRow
          title={c.manage}
          subtitle={c.plan(entitlement.status)}
          icon="lock"
          onPress={() => navigate('subscription')}
        />
        <CompactRow
          title={c.permissionNames.notifications}
          icon="bell"
          toggle={notificationsOn}
          onToggle={(on) =>
            usePermissionsStore.getState().patch({ notifications: on ? 'granted' : 'denied' })
          }
        />
        <CompactRow
          title={c.reportBug}
          subtitle={c.reportBugBody}
          icon="info"
          onPress={() => navigate('bug')}
        />
        <CompactRow
          title={c.giveFeedback}
          subtitle={c.giveFeedbackBody}
          icon="star"
          onPress={() => navigate('feedback')}
        />
        <CompactRow
          title={c.supportRow}
          subtitle={c.supportRowBody}
          icon="mail"
          onPress={() => {
            void openSupportEmail().catch(() => setMailNote(true));
          }}
        />
        <CompactRow title={c.legal} subtitle={c.legalBody} icon="list" onPress={() => navigate('legal')} />
      </CompactGroup>
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
            onDev();
          } else taps.current += 1;
        }}>
        <Label tone="secondary" style={{ textAlign: 'center' }}>
          {version}
        </Label>
      </PressableScale>
    </ScreenShell>
  );
}
