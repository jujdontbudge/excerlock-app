import { useState } from 'react';
import { View } from 'react-native';
import { Heading, Label, PrimaryButton, SecondaryButton } from '../../design-system';
import { tokens as t } from '../../design-system/tokens';
import { LivingIcon } from '../../motion/LivingIcon';
import { Reveal } from '../../motion/Reveal';
import { setupCopy as c } from '../../content/setup';
import { useRuntime } from '../../runtime/AppRuntimeProvider';
import { permissionsStore as usePermissionsStore } from '../../state/permissionsStore';
import { AutoDetectToggle } from './AutoDetectToggle';
const content = {
  screenTime: {
    title: c.X1,
    body: c.screenTimeBody,
    allow: c.screenTimeAllow,
    denied: c.screenTimeDenied,
    icon: 'shield',
  },
  motion: { title: c.motionTitle, body: c.motionBody, allow: c.motionAllow, denied: c.motionDenied, icon: 'walking' },
  health: { title: c.healthTitle, body: c.healthBody, allow: c.healthAllow, denied: c.healthDenied, icon: 'heart' },
  location: {
    title: c.locationTitle,
    body: c.locationBody,
    allow: c.locationAllow,
    denied: c.locationDenied,
    icon: 'map-pin',
  },
} as const;
export function PermissionPrimer({ name, onContinue }: { name: keyof typeof content; onContinue: () => void }) {
  const runtime = useRuntime(),
    status = usePermissionsStore((s) => s.data[name]),
    [busy, setBusy] = useState(false),
    [note, setNote] = useState(false),
    copy = content[name];
  const granted = ['granted', 'whenInUse', 'always'].includes(status),
    denied = ['denied', 'restricted'].includes(status);
  const request = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (name === 'screenTime') await runtime.screenTime.requestAuthorization();
      else if (name === 'motion') await runtime.steps.request();
      else if (name === 'health') await runtime.health.request();
      else await runtime.gym.requestLocation();
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Heading title={copy.title} support={copy.body} />
      <LivingIcon name={copy.icon} />
      {name === 'screenTime'
        ? c.screenTimeFacts.map((fact, index) => (
            <Reveal key={fact} index={index + 1}>
              <Label>{fact}</Label>
            </Reveal>
          ))
        : null}
      {granted ? (
        <Reveal>
          <Label style={{ color: t.state.success }}>{c.granted}</Label>
        </Reveal>
      ) : null}
      {name === 'location' && granted ? <AutoDetectToggle /> : null}
      {denied ? (
        <Reveal>
          <Label tone="secondary">{copy.denied}</Label>
        </Reveal>
      ) : null}
      {note ? (
        <Reveal>
          <Label tone="secondary">{c.settingsNote}</Label>
        </Reveal>
      ) : null}
      <View style={{ flexGrow: 1 }} />
      {granted ? (
        <PrimaryButton label={c.continue} onPress={onContinue} />
      ) : (
        <>
          {denied ? (
            <PrimaryButton label={c.settings} onPress={() => setNote(true)} />
          ) : (
            <PrimaryButton label={copy.allow} onPress={request} loading={busy} />
          )}
          <SecondaryButton label={denied ? c.anyway : c.skip} disabled={busy} variant="tertiary" onPress={onContinue} />
        </>
      )}
    </>
  );
}
