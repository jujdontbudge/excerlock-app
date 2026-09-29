import { sessionCopy } from '../../enforcement/sessionsCopy';
import { rulesStore } from '../../conditions/rulesStore';
import { subscriptionCopy } from '../../subscription/subscriptionCopy';
import { useState } from 'react';
import { useRuntime } from '../../ports/useRuntime';
import { requireRuntimeControls } from '../../ports/Runtime';
import { useClock, useDevSnapshot } from '../../lock/selectors';
import { permissionsStore as usePermissionsStore } from '../../permissions/permissionsStore';
import { entitlementStore as useEntitlementStore } from '../../subscription/entitlementStore';
import { SettingsGroup, SettingsRow, TextField, Label, SegmentedControl, PrimaryButton } from '../../ui';
import { devCopy as c } from './devCopy';
import { Permissions } from '../../model/types';
import { onboardingStore } from '../../onboarding/onboardingStore';
import { historyStore } from '../../progress/historyStore';
import { profileStore } from '../../preferences/profileStore';
import { settingsStore } from '../../preferences/settingsStore';
import { useRouter } from 'expo-router';
export function DevControls() {
  const runtime = useRuntime(),
    dev = requireRuntimeControls(runtime),
    router = useRouter(),
    now = useClock(),
    view = useDevSnapshot(),
    permissions = usePermissionsStore((s) => s.data),
    entitlement = useEntitlementStore((s) => s.data.entitlement),
    conditionCount = rulesStore.getState().data.rules.length,
    planStaged = onboardingStore.getState().data.answers.ruleCommitted === false,
    [time, setTime] = useState(now),
    [error, setError] = useState('');
  const runAccountAction = async (action: () => Promise<void>) => {
    try {
      await action();
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };
  return (
    <>
      <SettingsGroup title="Account data">
        <SettingsRow title="Run local sign-out isolation" onPress={() => void runAccountAction(() => dev.runLabLocalSignOut())} />
        <SettingsRow title="Run linked provider isolation" onPress={() => void runAccountAction(() => dev.runLabProviderLinking())} />
        <SettingsRow title="Run concurrent restore race" onPress={() => void runAccountAction(() => dev.runLabConcurrentRestore())} />
        <SettingsRow title="Run established restore transfer" onPress={() => void runAccountAction(() => dev.runLabEstablishedTransfer())} />
        <SettingsRow title="Run A B A isolation" onPress={() => void runAccountAction(() => dev.runLabAccountIsolation())} />
        <SettingsRow title="Run account switch ordering" onPress={() => void runAccountAction(() => dev.runLabAccountSwitchOrdering())} />
        <SettingsRow title="Run delayed callback isolation" onPress={() => void runAccountAction(() => dev.runLabDelayedCallbackIsolation())} />
        <SettingsRow title="Prepare deletion callback user path" onPress={() => void runAccountAction(async () => {
          await dev.prepareLabDeletionCallbackIsolation();
          router.replace('/recovery');
        })} />
        <SettingsRow title="Run deletion callback isolation" onPress={() => void runAccountAction(() => dev.runLabDeletionCallbackIsolation())} />
        <SettingsRow title={`Active account ${view.accountData?.active ?? 'None'}`} />
        <SettingsRow title={`Legacy data ${view.accountData?.legacyQuarantined ? 'Quarantined' : 'None'}`} />
        <SettingsRow title={`Condition owner ${rulesStore.getState().data.rules[0]?.id === 'account-a' ? 'Account A' : rulesStore.getState().data.rules[0]?.id === 'account-b' ? 'Account B' : 'None'}`} />
        <SettingsRow title={`History Days ${String(historyStore.getState().data.days.length)}`} />
        <SettingsRow title={`Profile ${profileStore.getState().data.name || 'None'}`} />
        <SettingsRow title={`Saved Gym ${settingsStore.getState().data.gymPlaces[0]?.name ?? 'None'}`} />
        <SettingsRow title={`Checkpoints ${view.accountData?.checkpoints ?? 'None'}`} />
        <SettingsRow title={`Switch ordering ${view.accountData?.switchOrdering ?? 'None'}`} />
        <SettingsRow title={`Activity checkpoints ${view.accountData?.activityCheckpoints ?? 'None'}`} />
        <SettingsRow title="Use account A" onPress={() => void runAccountAction(() => dev.useLabAccount('A'))} />
        <SettingsRow title="Seed account A" onPress={() => void runAccountAction(() => dev.seedLabAccount('A'))} />
        <SettingsRow title="Use account B" onPress={() => void runAccountAction(() => dev.useLabAccount('B'))} />
        <SettingsRow title="Seed account B" onPress={() => void runAccountAction(() => dev.seedLabAccount('B'))} />
        {error ? <Label>{error}</Label> : null}
      </SettingsGroup>
      <SettingsGroup title="Journey data">
        <SettingsRow title="Conditions" value={String(conditionCount)} />
        <SettingsRow title="Onboarding plan" value={planStaged ? 'Staged' : 'Not staged'} />
        <SettingsRow title={`Purchase recovery ${runtime.subscription.recovery().type}`} />
        <SettingsRow title={`Purchase operations ${String(view.subscriptionLab?.purchases ?? 0)}`} />
        <SettingsRow title={`Restore operations ${String(view.subscriptionLab?.restores ?? 0)}`} />
        <SettingsRow title={`Delayed callbacks ${String(view.subscriptionLab?.queued ?? 0)}/${String(view.subscriptionLab?.delivered ?? 0)}`} />
        <SettingsRow title={`Callback isolation ${view.subscriptionLab?.callbackIsolation ?? 'Not run'}`} />
        <SettingsRow title={`Deletion isolation ${view.subscriptionLab?.deletionIsolation ?? 'Not run'}`} />
        <SettingsRow title={`Transfer isolation ${view.subscriptionLab?.transferIsolation ?? 'Not run'}`} />
        <SettingsRow title={`Concurrent restore ${view.subscriptionLab?.concurrentRestoreIsolation ?? 'Not run'}`} />
        <SettingsRow title={`Linked providers ${view.subscriptionLab?.providerLinking ?? 'Not run'}`} />
        <SettingsRow title={`Provider attempts ${view.subscriptionLab?.providerAttempts ?? 'Not run'}`} />
        <SettingsRow title={`Provider conflict ${view.subscriptionLab?.providerConflict ?? 'Not run'}`} />
        <SettingsRow title={`Local sign-out ${view.subscriptionLab?.localSignOutIsolation ?? 'Not run'}`} />
      </SettingsGroup>
      <SettingsGroup title="Treadmill gait">
        <SettingsRow title="Replay walking gait" onPress={() => dev.setGait('walking')} />
        <SettingsRow title="Still / needs framing" onPress={() => dev.setGait('still')} />
        <SettingsRow title="No gait" onPress={() => dev.setGait('none')} />
      </SettingsGroup>
      <SettingsGroup title={sessionCopy.motion}>
        <SegmentedControl
          options={sessionCopy.motions}
          value={view.motion}
          onChange={(v) => dev.setMotion(v as 'walking' | 'still')}
        />
      </SettingsGroup>
      <SettingsGroup title={sessionCopy.presence}>
        <SegmentedControl
          options={sessionCopy.presences}
          value={view.presence}
          onChange={(v) => dev.setPresence(v as 'inside' | 'outside')}
        />
      </SettingsGroup>
      <SettingsGroup title={sessionCopy.placement}>
        <SegmentedControl
          options={sessionCopy.placements}
          value={view.placement ?? 'propped'}
          onChange={(v) => dev.setPlacement(v as 'propped' | 'handheld')}
        />
      </SettingsGroup>
      <SettingsGroup title={c.clock}>
        <SettingsRow
          title={c.addSteps}
          onPress={() => {
            void runtime.steps.stepsSince(now).then((value) => dev.setSteps(value + 1000));
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
        <SettingsRow title={c.hour} onPress={() => dev.advance(3600000)} />
        <SettingsRow title={c.day} onPress={() => dev.advance(86400000)} />
        <TextField label={c.time} value={time} onChangeText={setTime} error={error} />
        <PrimaryButton
          label={c.set}
          onPress={() => {
            try {
              dev.setTime(time);
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
          onChange={(mode) => dev.setPromptMode(mode as typeof view.promptMode)}
        />
      </SettingsGroup>
      <SettingsGroup title={c.outcome}>
        <SegmentedControl
          options={c.outcomes}
          value={view.outcome}
          onChange={(outcome) => dev.setOutcome(outcome as typeof view.outcome)}
        />
      </SettingsGroup>
      <SettingsGroup title={subscriptionCopy.restoreOutcome}>
        <Label>{subscriptionCopy.devNote}</Label>
        <SegmentedControl
          options={subscriptionCopy.restoreOutcomes}
          value={view.restoreOutcome}
          onChange={(value) => dev.setRestoreOutcome(value as typeof view.restoreOutcome)}
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
              dev.setPermission(
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
            onPress={() => dev.setEntitlement(status)}
          />
        ))}
        <SettingsRow title={c.anonymous} onPress={() => dev.setSession({ kind: 'anonymous' })} />
        <SettingsRow
          title={c.apple}
          onPress={() => dev.setSession({ kind: 'signedIn', provider: 'apple', email: 'alex@example.test' })}
        />
      </SettingsGroup>
    </>
  );
}
