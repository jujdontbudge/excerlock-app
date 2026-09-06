import { useState } from 'react';
import { View } from 'react-native';
import { Heading, Label, PrimaryButton, SecondaryButton } from '../../design-system';
import { LivingIcon } from '../../motion/LivingIcon';
import { Reveal } from '../../motion/Reveal';
import { setupCopy as c } from '../../content/setup';
import { pickerCopy } from '../../content/pickers';
import { useRuntime } from '../../runtime/AppRuntimeProvider';
import { rulesStore as useRulesStore } from '../../state/rulesStore';
export function AppsSetup({ onContinue }: { onContinue: () => void }) {
  const runtime = useRuntime(),
    selection = useRulesStore((s) => s.data.lockedApps),
    [busy, setBusy] = useState(false);
  const choose = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await runtime.screenTime.presentAppPicker();
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Heading title={c.X2} support={c.appsBody} />
      <LivingIcon name="lock" />
      <Reveal key={`${selection.appCount}-${selection.categoryCount}`}>
        <Label>{pickerCopy.counts(selection.appCount, selection.categoryCount)}</Label>
      </Reveal>
      <SecondaryButton label={c.chooseApps} disabled={busy} onPress={choose} />
      <View style={{ flexGrow: 1 }} />
      <PrimaryButton
        label={c.continue}
        disabled={selection.appCount + selection.categoryCount === 0 || busy}
        onPress={onContinue}
      />
      <SecondaryButton label={c.skip} variant="tertiary" disabled={busy} onPress={onContinue} />
    </>
  );
}
