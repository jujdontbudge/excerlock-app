import { settingsStore as useSettingsStore } from '../../state/settingsStore';
import { GymPickerScreen } from './GymPickerScreen';
export function BuilderGymStep({ onSaved, onBack }: { onSaved: () => void; onBack?: () => void }) {
  const gyms = useSettingsStore((s) => s.data.gymPlaces);
  return <GymPickerScreen placeId={gyms[gyms.length - 1]?.id} onSaved={onSaved} onBack={onBack} />;
}
