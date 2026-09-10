import { useRef, useState } from 'react';
import Constants from 'expo-constants';
import { ScreenShell, Label, PressableScale } from '../../design-system';
import { CompactGroup, CompactRow } from '../../design-system/CompactGroup';
import { profileStore as useProfileStore } from '../../state/profileStore';
import { entitlementStore as useEntitlementStore } from '../../state/entitlementStore';
import { settingsCopy as c } from '../../content/settings';
import { supportCopy as s } from '../../content/support';
import { openSupportEmail } from '../../runtime/SupportDelivery';

export function SettingsScreen({ navigate, onDev }: { navigate: (path: string) => void; onDev: () => void }) {
  const name = useProfileStore((s) => s.data.name),
    entitlement = useEntitlementStore((s) => s.data.entitlement),
    taps = useRef(0),
    [mailNote, setMailNote] = useState(false);
  const version = c.version(Constants.expoConfig?.version ?? '1.0.0', Constants.expoConfig?.ios?.buildNumber ?? '1');
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
        <CompactRow title={c.preferences} icon="gear" onPress={() => navigate('preferences')} />
        <CompactRow title={c.unitsRow} icon="map-pin" onPress={() => navigate('units')} />
      </CompactGroup>
      <CompactGroup>
        <CompactRow title={c.permissionNames.screenTime} icon="shield" onPress={() => navigate('permission/screenTime')} />
        <CompactRow title={c.permissionNames.motion} icon="walking" onPress={() => navigate('permission/motion')} />
        <CompactRow title={c.permissionNames.location} icon="map-pin" onPress={() => navigate('permission/location')} />
        <CompactRow title={c.permissionNames.camera} icon="person" onPress={() => navigate('permission/camera')} />
        <CompactRow title={c.permissionNames.notifications} icon="bell" onPress={() => navigate('permission/notifications')} />
      </CompactGroup>
      <CompactGroup>
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
