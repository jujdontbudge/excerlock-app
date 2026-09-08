import { sessionCopy } from '../../content/sessions';
import { rulesStore } from '../../state/rulesStore';
import { subscriptionCopy } from '../../content/subscription';
import { useState } from 'react';
import { useRuntime } from '../../runtime/AppRuntimeProvider';
import { useClock, useDevSnapshot } from '../../state/selectors';
import { permissionsStore as usePermissionsStore } from '../../state/permissionsStore';
import { entitlementStore as useEntitlementStore } from '../../state/entitlementStore';
import { SettingsGroup, SettingsRow, TextField, Label, SegmentedControl, PrimaryButton } from '../../design-system';
import { devCopy as c } from '../../content/dev';
import { Permissions } from '../../domain/types';
export function DevControls() {
  const runtime = useRuntime(),
    now = useClock(),
    view = useDevSnapshot(),
    permissions = usePermissionsStore((s) => s.data),
    entitlement = useEntitlementStore((s) => s.data.entitlement),
    [time, setTime] = useState(now),
    [error, setError] = useState('');
  return (
    <>
      <SettingsGroup title="Treadmill gait">
        <SettingsRow title="Replay walking gait" onPress={() => runtime.dev.setGait('walking')} />
        <SettingsRow title="Still / needs framing" onPress={() => runtime.dev.setGait('still')} />
        <SettingsRow title="No gait" onPress={() => runtime.dev.setGait('none')} />
      </SettingsGroup>
      <SettingsGroup title={sessionCopy.presence}>
        <SegmentedControl
          options={sessionCopy.presences}
          value={view.presence}
          onChange={(v) => runtime.dev.setPresence(v as 'inside' | 'outside')}
        />
      </SettingsGroup>
      <SettingsGroup title={sessionCopy.placement}>
        <SegmentedControl
          options={sessionCopy.placements}
          value={view.placement ?? 'propped'}
          onChange={(v) => runtime.dev.setPlacement(v as 'propped' | 'handheld')}
        />
      </SettingsGroup>
      <SettingsGroup title={c.clock}>
        <SettingsRow
          title={c.addSteps}
          onPress={() => {
            void runtime.steps.stepsSince(now).then((value) => runtime.dev.setSteps(value + 1000));
          }}
        />
        <SettingsRow
          title={c.pauseAll}
          onPress={() =>
            rulesStore
              .getState()
              .patch({ rules: rulesStore.getState().data.rules.map((rule) => ({ ...rule, enabled: false })) })
          }
        />
        <Label>{now}</Label>
        <SettingsRow title={c.hour} onPress={() => runtime.dev.advance(3600000)} />
        <SettingsRow title={c.day} onPress={() => runtime.dev.advance(86400000)} />
        <TextField label={c.time} value={time} onChangeText={setTime} error={error} />
        <PrimaryButton
          label={c.set}
          onPress={() => {
            try {
              runtime.dev.setTime(time);
              setError('');
            } catch {
              setError(c.time);
            }
          }}
        />
      </SettingsGroup>
      <SettingsGroup title={c.prompt}>
        <SegmentedControl
          options={c.modes}
          value={view.promptMode}
          onChange={(mode) => runtime.dev.setPromptMode(mode as typeof view.promptMode)}
        />
      </SettingsGroup>
      <SettingsGroup title={c.outcome}>
        <SegmentedControl
          options={c.outcomes}
          value={view.outcome}
          onChange={(outcome) => runtime.dev.setOutcome(outcome as typeof view.outcome)}
        />
      </SettingsGroup>
      <SettingsGroup title={subscriptionCopy.restoreOutcome}>
        <Label>{subscriptionCopy.devNote}</Label>
        <SegmentedControl
          options={subscriptionCopy.restoreOutcomes}
          value={view.restoreOutcome}
          onChange={(value) => runtime.dev.setRestoreOutcome(value as typeof view.restoreOutcome)}
        />
      </SettingsGroup>
      <SettingsGroup title={c.permissions}>
        {(Object.keys(c.permissionNames) as (keyof Permissions)[]).map((name) => (
          <SettingsRow
            key={name}
            title={c.permissionNames[name]}
            value={permissions[name]}
            onPress={() => {
              const values =
                name === 'location'
                  ? (['notDetermined', 'whenInUse', 'always', 'denied'] as const)
                  : (['notDetermined', 'granted', 'denied', 'restricted'] as const);
              runtime.dev.setPermission(
                name,
                values[(values.findIndex((v) => v === permissions[name]) + 1) % values.length],
              );
            }}
          />
        ))}
      </SettingsGroup>
      <SettingsGroup title={c.identity}>
        {c.entitlements.map((status) => (
          <SettingsRow
            key={status}
            title={status}
            value={entitlement.status === status ? '✓' : undefined}
            onPress={() => runtime.dev.setEntitlement(status)}
          />
        ))}
        <SettingsRow
          title={c.anonymous}
          onPress={() => runtime.dev.setSession({ kind: 'anonymous', userId: 'fake-anonymous-user' })}
        />
        <SettingsRow
          title={c.apple}
          onPress={() =>
            runtime.dev.setSession({
              kind: 'signedIn',
              userId: 'fake-signed-in-user',
              provider: 'apple',
              email: 'alex@example.test',
            })
          }
        />
      </SettingsGroup>
    </>
  );
}
