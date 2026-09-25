import { useState } from 'react';
import { Href, useRouter } from 'expo-router';
import { useRuntime } from '../../ports/useRuntime';
import { requireRuntimeControls } from '../../runtime/Runtime';
import { useDevSnapshot } from '../../state/selectors';
import { ScreenShell, Heading, SettingsGroup, SettingsRow, SecondaryButton, Label } from '../../design-system';
import { DevControls } from './DevControls';
import { devCopy as c } from '../../content/dev';
import { LivingIcon } from '../../motion/LivingIcon';
export function DevMenu() {
  const runtime = useRuntime(),
    dev = requireRuntimeControls(runtime),
    router = useRouter(),
    view = useDevSnapshot(),
    [busy, setBusy] = useState(false);
  const load = async (id: string, keep = false) => {
    setBusy(true);
    try {
      await dev.load(id, keep);
    } finally {
      setBusy(false);
    }
  };
  return (
    <ScreenShell footer={<SecondaryButton label={c.open} onPress={() => router.replace('/')} />}>
      <LivingIcon name="gear" />
      <Heading title={c.title} support={c.support} />
      <Label>{view.scenarioId}</Label>
      <DevControls />
      <SettingsGroup>
        {dev.scenarios.map((s) => (
          <SettingsGroup key={s.id} title={s.title}>
            <SettingsRow
              title={c.loadPrefix(s.title)}
              value={view.scenarioId === s.id ? '✓' : undefined}
              onPress={() => {
                if (!busy) void load(s.id);
              }}
            />
            <SettingsRow
              title={c.keepPrefix(s.title)}
              onPress={() => {
                if (!busy) void load(s.id, true);
              }}
            />
          </SettingsGroup>
        ))}
      </SettingsGroup>
      <SettingsGroup>
        <SettingsRow title={c.previews} onPress={() => router.push('/dev?gallery=1' as Href)} />
        <SettingsRow title={c.shield} onPress={() => router.push('/dev?stage=shield' as Href)} />
      </SettingsGroup>
      <SettingsGroup title={c.events}>
        {view.events.length ? (
          view.events.map((event, i) => (
            <Label key={`${event.at}-${i}`}>
              {event.event} {JSON.stringify(event.props)}
            </Label>
          ))
        ) : (
          <Label>{c.emptyEvents}</Label>
        )}
      </SettingsGroup>
      <SettingsGroup title={c.record}>
        <Label>{c.recordCommand}</Label>
      </SettingsGroup>
    </ScreenShell>
  );
}
