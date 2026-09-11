import { useState } from 'react';
import { Heading, Label, ChoiceRow } from '../../design-system';
import { settingsStore as useSettingsStore } from '../../state/settingsStore';
import { settingsCopy as c } from '../../content/settings';
import { SettingsPage } from './SettingsPage';
import { setUnits } from './preferences';
export function UnitsScreen({ onBack }: { onBack: () => void }) {
  const units = useSettingsStore((s) => s.data.units),
    [error, setError] = useState(false);
  const choose = (next: 'km' | 'mi') => {
    try {
      setUnits(next);
      setError(false);
    } catch {
      setError(true);
    }
  };
  return (
    <SettingsPage onBack={onBack}>
      <Heading title={c.units} />
      <ChoiceRow title={c.kilometers} selected={units === 'km'} onPress={() => choose('km')} />
      <ChoiceRow title={c.miles} selected={units === 'mi'} onPress={() => choose('mi')} />
      {error ? <Label accessibilityRole="alert">{c.unitsError}</Label> : null}
    </SettingsPage>
  );
}
