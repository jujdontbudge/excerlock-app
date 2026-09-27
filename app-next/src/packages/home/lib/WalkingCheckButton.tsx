import { useState } from 'react';
import { Rule } from '../../model/types';
import { homeCopy as c } from '../homeCopy';
import { haptic } from '../../ui/haptics';
import { UnlockEntry } from '../../unlock/UnlockEntry';

export function WalkingCheckButton({
  rule,
  checkWalking,
}: {
  rule: Rule;
  checkWalking: (rule: Rule) => Promise<boolean>;
}) {
  const [result, setResult] = useState<'idle' | 'detected' | 'missed'>('idle');
  const check = () => {
    void checkWalking(rule).then((observed) => {
      if (observed) {
        haptic('success');
        setResult('detected');
      } else {
        haptic('warning');
        setResult('missed');
      }
    }).catch(() => { haptic('error'); setResult('missed'); });
  };
  return (
    <UnlockEntry
      kind="walking"
      label={result === 'detected' ? c.walkDetected : result === 'missed' ? c.walkNotDetected : c.walkingEntry}
      onPress={check}
      inverted
    />
  );
}
