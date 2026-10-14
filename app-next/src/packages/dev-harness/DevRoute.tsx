import { ShieldPreview } from '../enforcement/ShieldPreview';
import { applyDevControls } from './lib/applyDevControls';
import { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRuntime } from '../ports/useRuntime';
import { PreviewGallery } from './lib/PreviewGallery';
import { DevMenu } from './lib/DevMenu';
import { IconSpecimen, TypeSpecimen } from './lib/TypeSpecimen';
import { RewardMotionPreview } from './lib/RewardMotionPreview';
import { BankDemoPreview } from './lib/BankDemoPreview';
import { requireRuntimeControls } from '../ports/Runtime';
export function DevRoute() {
  const { component, gallery, stage, activity, cast, scenario, keep, restore, outcome, prompt, setup, journey, notification, lab, advance } = useLocalSearchParams<{
      component?: string;
      stage?: string;
      activity?: string;
      cast?: string;
      gallery?: string;
      scenario?: string;
      keep?: string;
      restore?: string;
      outcome?: string;
      prompt?: string;
      setup?: string;
      journey?: string;
      notification?: string;
      lab?: string;
      advance?: string;
    }>(),
    runtime = useRuntime(),
    dev = requireRuntimeControls(runtime),
    router = useRouter();
  useEffect(() => {
    if (scenario || restore || outcome || prompt || setup || journey || notification || lab || advance)
      void applyDevControls(dev, { scenario, keep, restore, outcome, prompt, setup, journey, notification, lab, advance }).then(() => {
        if (advance && router.canGoBack()) router.back();
        else if (!notification) router.replace('/');
      });
  }, [scenario, keep, restore, outcome, prompt, setup, journey, notification, lab, advance, dev, router]);
  if (stage === 'shield')
    return <ShieldPreview onOpen={() => router.replace('/home')} onClose={() => router.replace('/dev')} />;
  if (stage === 'type') return <TypeSpecimen />;
  if (stage === 'bank-demo') return <BankDemoPreview {...{ activity, cast }} />;
  if (stage === 'icons') return <IconSpecimen />;
  if (stage === 'rewards') return <RewardMotionPreview />;
  return component || gallery ? <PreviewGallery /> : <DevMenu />;
}
