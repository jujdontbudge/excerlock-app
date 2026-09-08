import { SettingsGroup, SettingsRow } from '../../../design-system';
import { settingsCopy as c } from '../../../content/settings';
import { useRuntime } from '../../../runtime/AppRuntimeProvider';
import { rulesStore as useRulesStore } from '../../../state/rulesStore';

export function PlanSection({ navigate }: { navigate: (path: string) => void }) {
  const runtime = useRuntime();
  const selection = useRulesStore((state) => state.data.lockedApps);
  return (
    <SettingsGroup title={c.yourPlan}>
      <SettingsRow
        title={c.apps}
        value={c.selection(selection.appCount, selection.categoryCount)}
        icon="lock"
        onPress={() => void runtime.screenTime.presentAppPicker()}
      />
      <SettingsRow title={c.conditions} icon="list" onPress={() => navigate('conditions')} />
      <SettingsRow title={c.gyms} icon="gym" onPress={() => navigate('gyms')} />
    </SettingsGroup>
  );
}
