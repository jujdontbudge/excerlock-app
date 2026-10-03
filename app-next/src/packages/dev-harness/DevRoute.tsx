import { ShieldPreview } from '../enforcement/ShieldPreview';
import { applyDevControls } from './lib/applyDevControls';
import { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRuntime } from '../ports/useRuntime';
import { PreviewGallery } from './lib/PreviewGallery';
import { DevMenu } from './lib/DevMenu';
import { requireRuntimeControls } from '../ports/Runtime';
export function DevRoute() {
  const { component, gallery, stage, scenario, keep, restore, outcome, prompt, setup, journey, notification, lab, advance } = useLocalSearchParams<{
      component?: string;
      stage?: string;
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
  return component || gallery ? <PreviewGallery /> : <DevMenu />;
}
