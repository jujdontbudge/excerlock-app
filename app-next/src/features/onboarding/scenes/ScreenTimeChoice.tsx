import { ChoiceRow } from '../../../design-system';

export function ScreenTimeChoice({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return <ChoiceRow emphasis="solid" title={label} selected={selected} onPress={onPress} />;
}
