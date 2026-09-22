import { ReactNode } from 'react';
import { ChoiceRow } from '../../../design-system';

/** Onboarding profile questions use the same right-check selection row as the rest of the app. */
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
