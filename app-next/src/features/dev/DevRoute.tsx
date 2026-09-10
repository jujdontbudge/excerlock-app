import { ShieldPreview } from '../sessions/ShieldPreview';
import { applyDevControls } from './applyDevControls';
import { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRuntime } from '../../runtime/AppRuntimeProvider';
import { PreviewGallery } from './PreviewGallery';
import { DevMenu } from './DevMenu';
import { requireRuntimeControls } from '../../runtime/Runtime';
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
