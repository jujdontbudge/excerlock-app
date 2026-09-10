import { useState } from 'react';
import { Rule } from '../../domain/types';
import { homeCopy as c } from '../../content/home';
import { feedback } from '../../motion/haptics';
import { UnlockEntry } from '../unlock/UnlockEntry';

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
        feedback('success');
        setResult('detected');
      } else {
        feedback('error');
        setResult('missed');
      }
    }).catch(() => { feedback('error'); setResult('missed'); });
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
