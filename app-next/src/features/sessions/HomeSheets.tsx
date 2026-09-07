import { Rule } from '../../domain/types';
import { WalkingSheet } from './WalkingSheet';
export function HomeSheets({
  sheet,
  rules,
  onDismiss,
}: {
  sheet: { type: 'walk' | 'checkin'; ruleId: string } | null;
  rules: Rule[];
  onDismiss: () => void;
  onChooseGym: () => void;
}) {
  const rule = rules.find((r) => r.enabled && r.id === sheet?.ruleId);
  if (sheet?.type === 'walk' && rule) return <WalkingSheet rule={rule} onDismiss={onDismiss} />;
  return null;
}
