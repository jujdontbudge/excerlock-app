import { Rule } from '../../domain/types';
import { WalkingSheet } from './WalkingSheet';
import { CheckInSheet } from './CheckInSheet';
export function HomeSheets({
  sheet,
  rules,
  onDismiss,
  onChooseGym,
}: {
  sheet: { type: 'walk' | 'checkin'; ruleId: string } | null;
  rules: Rule[];
  onDismiss: () => void;
  onChooseGym: () => void;
}) {
  const rule = rules.find((r) => r.enabled && r.id === sheet?.ruleId);
  if (sheet?.type === 'walk' && rule) return <WalkingSheet rule={rule} onDismiss={onDismiss} />;
  if (sheet?.type === 'checkin')
    return <CheckInSheet arrival={rule?.mode.kind === 'event'} onDismiss={onDismiss} onChooseGym={onChooseGym} />;
  return null;
}
