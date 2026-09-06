import { settingsStore as useSettingsStore } from '../../state/settingsStore';
import { useState } from 'react';
import { View } from 'react-native';
import Constants from 'expo-constants';
import {
  ScreenShell,
  Heading,
  SettingsGroup,
  SettingsRow,
  PermissionRow,
  Label,
  PressableScale,
  BottomSheet,
  PrimaryButton,
  ChoiceRow,
} from '../../design-system';
import { tokens as t } from '../../design-system/tokens';
import { profileStore as useProfileStore } from '../../state/profileStore';
import { sessionStore as useSessionStore } from '../../state/sessionStore';
import { permissionsStore as usePermissionsStore } from '../../state/permissionsStore';
import { entitlementStore as useEntitlementStore } from '../../state/entitlementStore';
import { settingsCopy as c } from '../../content/settings';
import { useRuntime } from '../../runtime/AppRuntimeProvider';
import { LivingIcon } from '../../motion/LivingIcon';
import { Reveal } from '../../motion/Reveal';
import { Preferences } from './PreferencesPanel';
import { permissionIcons } from './PermissionDetail';
import { Permissions } from '../../domain/types';
export function SettingsScreen({ navigate, onDev }: { navigate: (path: string) => void; onDev: () => void }) {
  const name = useProfileStore((s) => s.data.name),
    session = useSessionStore((s) => s.data.session),
    permissions = usePermissionsStore((s) => s.data),
    entitlement = useEntitlementStore((s) => s.data.entitlement),
    runtime = useRuntime(),
    [note, setNote] = useState(''),
    [sharing, setSharing] = useState(false),
    [copied, setCopied] = useState(false),
    [taps, setTaps] = useState(0),
    [busy, setBusy] = useState(false),
    [grace, setGrace] = useState(false);
  const stopGrace = useSettingsStore((s) => s.data.stopGrace);
  const restore = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await runtime.subscription.restore();
      setNote(['trial', 'active'].includes(result.status) ? c.restored : c.noRestore);
    } catch {
      setNote(c.error);
    } finally {
      setBusy(false);
    }
  };
  return (
    <ScreenShell
      safeBottom={false}
      overlay={
        <>
          <BottomSheet open={sharing} title={c.share} onDismiss={() => setSharing(false)}>
            <LivingIcon name="arrow" />
            <Label>{c.shareBody}</Label>
            <PrimaryButton label={c.shareCopy} onPress={() => setCopied(true)} />
            {copied ? (
              <Reveal>
                <Label>{c.copied}</Label>
              </Reveal>
            ) : null}
          </BottomSheet>
          <BottomSheet open={grace} title={c.grace} onDismiss={() => setGrace(false)}>
            {c.graceOptions.map((label, i) => (
              <ChoiceRow
                key={label}
                title={label}
                selected={stopGrace === [30, 60, 120, 180, 300][i]}
                onPress={() => {
                  useSettingsStore.getState().patch({ stopGrace: [30, 60, 120, 180, 300][i] });
                  setGrace(false);
                }}
              />
            ))}
          </BottomSheet>
        </>
      }>
      <Heading title={c.title} />
      <LivingIcon name="person" />
      <SettingsGroup title={c.general}>
        <SettingsRow
          title={name || c.account}
          value={session.kind === 'anonymous' ? c.anonymous : c.signedIn(session.provider)}
          icon="person"
          onPress={() => navigate('account')}
        />
      </SettingsGroup>
      <SettingsGroup title={c.subscription}>
        <SettingsRow
          title={c.plan(entitlement.status)}
          value={entitlement.renewsAt ? c.renewal(entitlement.renewsAt) : undefined}
          icon="star"
        />
        <SettingsRow title={c.manage} onPress={() => setNote(c.external)} />
        <SettingsRow title={c.restore} onPress={() => void restore()} />
      </SettingsGroup>
      {note ? (
        <Reveal key={note}>
          <Label accessibilityRole="alert">{note}</Label>
        </Reveal>
      ) : null}
      <SettingsGroup title={c.permissions}>
        <View style={{ paddingHorizontal: t.space.lg }}>
          {(Object.keys(c.permissionNames) as (keyof Permissions)[]).map((name) => (
            <PermissionRow
              key={name}
              title={c.permissionNames[name]}
              icon={permissionIcons[name]}
              status={
                ['granted', 'always', 'whenInUse'].includes(permissions[name])
                  ? 'Granted'
                  : permissions[name] === 'notDetermined'
                    ? 'Needed'
                    : 'Off'
              }
              onPress={() => navigate('permission/' + name)}
            />
          ))}
        </View>
      </SettingsGroup>
      <Preferences onGrace={() => setGrace(true)} />
      <SettingsGroup>
        <SettingsRow title={c.apps} icon="lock" onPress={() => void runtime.screenTime.presentAppPicker()} />
        <SettingsRow title={c.gyms} icon="gym" onPress={() => navigate('gyms')} />
      </SettingsGroup>
      <SettingsGroup title={c.community}>
        <SettingsRow
          title={c.share}
          icon="arrow"
          onPress={() => {
            setCopied(false);
            setSharing(true);
          }}
        />
        <SettingsRow title={c.rate} icon="star" onPress={() => setNote(c.rated)} />
      </SettingsGroup>
      <SettingsGroup title={c.other}>
        <SettingsRow title={c.support} icon="mail" onPress={() => navigate('support')} />
        <SettingsRow title={c.privacy} icon="shield" onPress={() => navigate('legal/privacy')} />
        <SettingsRow title={c.terms} icon="list" onPress={() => navigate('legal/terms')} />
        <SettingsRow title={c.account} icon="person" onPress={() => navigate('account')} />
      </SettingsGroup>
      <PressableScale
        label={c.version(Constants.expoConfig?.version ?? '1.0.0', Constants.expoConfig?.ios?.buildNumber ?? '1')}
        onPress={() => {
          if (taps === 6) {
            setTaps(0);
            onDev();
          } else setTaps(taps + 1);
        }}>
        <Label tone="secondary" style={{ textAlign: 'center' }}>
          {c.version(Constants.expoConfig?.version ?? '1.0.0', Constants.expoConfig?.ios?.buildNumber ?? '1')}
        </Label>
      </PressableScale>
    </ScreenShell>
  );
}
