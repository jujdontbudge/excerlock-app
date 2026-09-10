import { useState } from 'react';
import { Rule } from '../../domain/types';
import { homeCopy as c } from '../../content/home';
import { feedback } from '../../motion/haptics';
import { UnlockEntry } from '../unlock/UnlockEntry';

export function WalkingCheckButton({
  rule,
  observe,
  start,
  schedule = (callback) => { setTimeout(callback, 3000); },
}: {
  rule: Rule;
  observe: (callback: (walking: boolean) => void) => () => void;
  start: (rule: Rule) => Promise<unknown>;
  schedule?: (callback: () => void | Promise<void>) => void;
}) {
  const [result, setResult] = useState<'idle' | 'detected' | 'missed'>('idle');
  const check = () => {
    let observed = false;
    const unsubscribe = observe((walking) => { observed ||= walking; });
    schedule(() => {
      unsubscribe();
      if (observed) {
        void start(rule).catch(() => undefined);
        feedback('success');
        setResult('detected');
      } else {
        feedback('error');
        setResult('missed');
      }
    });
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
