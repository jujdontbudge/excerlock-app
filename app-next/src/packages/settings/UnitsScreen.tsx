import { Heading, ChoiceRow } from '../ui';
import { settingsStore as useSettingsStore } from '../preferences/settingsStore';
import { settingsCopy as c } from './lib/settingsCopy';
import { SettingsPage } from '../ui/SettingsPage';
import { setUnits } from '../preferences/preferences';
export function UnitsScreen({ onBack }: { onBack: () => void }) {
  const units = useSettingsStore((s) => s.data.units),
    choose = (next: 'km' | 'mi') => setUnits(next);
  return (
    <SettingsPage onBack={onBack}>
      <Heading title={c.units} />
      <ChoiceRow title={c.kilometers} selected={units === 'km'} onPress={() => choose('km')} />
      <ChoiceRow title={c.miles} selected={units === 'mi'} onPress={() => choose('mi')} />
    </SettingsPage>
  );
}
