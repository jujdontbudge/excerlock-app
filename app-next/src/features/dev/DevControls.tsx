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
      <SettingsGroup title={c.clock}>
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
        <SettingsRow title={c.anonymous} onPress={() => runtime.dev.setSession({ kind: 'anonymous' })} />
        <SettingsRow
          title={c.apple}
          onPress={() => runtime.dev.setSession({ kind: 'signedIn', provider: 'apple', email: 'alex@example.test' })}
        />
      </SettingsGroup>
    </>
  );
}
