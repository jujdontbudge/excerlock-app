import { ChoiceRow } from '../../../design-system';

/** Screen-time ranges share the app-wide right-check selection treatment. */
export function ScreenTimeChoice({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return <ChoiceRow title={label} selected={selected} onPress={onPress} />;
}
