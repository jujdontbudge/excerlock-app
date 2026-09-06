import { applyDevControls } from './applyDevControls';
import { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRuntime } from '../../runtime/AppRuntimeProvider';
import { PreviewGallery } from './PreviewGallery';
import { DevMenu } from './DevMenu';
export function DevRoute() {
  const { component, gallery, scenario, restore, outcome, prompt } = useLocalSearchParams<{
      component?: string;
      gallery?: string;
      scenario?: string;
      restore?: string;
      outcome?: string;
      prompt?: string;
    }>(),
    runtime = useRuntime(),
    router = useRouter();
  useEffect(() => {
    if (scenario || restore || outcome || prompt)
      void applyDevControls(runtime.dev, { scenario, restore, outcome, prompt }).then(() => router.replace('/'));
  }, [scenario, restore, outcome, prompt, runtime, router]);
  return component || gallery ? <PreviewGallery /> : <DevMenu />;
}
