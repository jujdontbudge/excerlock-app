import { ReactNode } from 'react';
import { ChoiceRow } from '../../../ui';

export function ProfileChoiceRow({
  title,
  selected,
  onPress,
  leading,
}: {
  title: string;
  selected: boolean;
  onPress: () => void;
  leading?: ReactNode;
  radioFirst?: boolean;
}) {
  return <ChoiceRow emphasis="solid" title={title} selected={selected} onPress={onPress} leading={leading} />;
}
