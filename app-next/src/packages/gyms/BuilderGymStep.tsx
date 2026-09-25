import { settingsStore as useSettingsStore } from '../preferences/settingsStore';
import { GymPickerScreen } from './GymPickerScreen';
export function BuilderGymStep({
  onSaved,
  onBack,
  onClose,
}: {
  onSaved: () => void;
  onBack?: () => void;
  onClose?: () => void;
}) {
  const gyms = useSettingsStore((s) => s.data.gymPlaces);
  return <GymPickerScreen placeId={gyms[gyms.length - 1]?.id} onSaved={onSaved} onBack={onBack} onClose={onClose} />;
}
