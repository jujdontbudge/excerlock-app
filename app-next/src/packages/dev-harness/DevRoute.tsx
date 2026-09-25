import { ShieldPreview } from '../enforcement/ShieldPreview';
import { applyDevControls } from './lib/applyDevControls';
import { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRuntime } from '../ports/useRuntime';
import { PreviewGallery } from './lib/PreviewGallery';
import { DevMenu } from './lib/DevMenu';
import { requireRuntimeControls } from '../ports/Runtime';
export function DevRoute() {
  const { component, gallery, stage, scenario, restore, outcome, prompt, setup } = useLocalSearchParams<{
      component?: string;
      stage?: string;
      gallery?: string;
      scenario?: string;
      restore?: string;
      outcome?: string;
      prompt?: string;
      setup?: string;
    }>(),
    runtime = useRuntime(),
    dev = requireRuntimeControls(runtime),
    router = useRouter();
  useEffect(() => {
    if (scenario || restore || outcome || prompt || setup)
      void applyDevControls(dev, { scenario, restore, outcome, prompt, setup }).then(() => router.replace('/'));
  }, [scenario, restore, outcome, prompt, setup, dev, router]);
  if (stage === 'shield')
    return <ShieldPreview onOpen={() => router.replace('/home')} onClose={() => router.replace('/dev')} />;
  return component || gallery ? <PreviewGallery /> : <DevMenu />;
}
