import { applyDevControls } from './applyDevControls';
import { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRuntime } from '../../runtime/AppRuntimeProvider';
import { PreviewGallery } from './PreviewGallery';
import { DevMenu } from './DevMenu';
export function DevRoute() {
  const { component, gallery, scenario, restore, outcome, prompt, setup } = useLocalSearchParams<{
      component?: string;
      gallery?: string;
      scenario?: string;
      restore?: string;
      outcome?: string;
      prompt?: string;
      setup?: string;
    }>(),
    runtime = useRuntime(),
    router = useRouter();
  useEffect(() => {
    if (scenario || restore || outcome || prompt || setup)
      void applyDevControls(runtime.dev, { scenario, restore, outcome, prompt, setup }).then(() => router.replace('/'));
  }, [scenario, restore, outcome, prompt, setup, runtime, router]);
  return component || gallery ? <PreviewGallery /> : <DevMenu />;
}
