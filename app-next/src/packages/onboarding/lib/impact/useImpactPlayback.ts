import { useEffect, useRef, useState } from 'react';
import { useMotion } from '../../../ui/useMotion';
import { impactTiming as timing } from './timing';
export function useImpactPlayback(step: string, advance: () => void, active = true) {
  const callback = useRef(advance);
  useEffect(() => {
    callback.current = advance;
  }, [advance]);
  const [readyStep, setReadyStep] = useState('');
  const { reduced } = useMotion();
  useEffect(() => {
    if (!active) return;
    const auto = !reduced && (step === 'O12' || step === 'O13');
    const delay =
      step === 'O11'
        ? timing.mathReady
        : step === 'O12'
          ? timing.year
          : step === 'O13'
            ? timing.free
            : step === 'O14'
              ? timing.scrollingReady
              : 0;
    const timer = setTimeout(() => (auto ? callback.current() : setReadyStep(step)), reduced ? 0 : delay);
    return () => clearTimeout(timer);
  }, [step, reduced, active]);
  const isStory = ['O11', 'O12', 'O13', 'O14'].includes(step);
  return { hideContinue: isStory && readyStep !== step && !reduced };
}
