import { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRuntime } from '../../runtime/AppRuntimeProvider';
import { PreviewGallery } from './PreviewGallery';
import { DevMenu } from './DevMenu';
export function DevRoute() {
  const { component, gallery, scenario } = useLocalSearchParams<{
      component?: string;
      gallery?: string;
      scenario?: string;
    }>(),
    runtime = useRuntime(),
    router = useRouter();
  useEffect(() => {
    if (scenario) void runtime.dev.load(scenario).then(() => router.replace('/'));
  }, [scenario, runtime, router]);
  return component || gallery ? <PreviewGallery /> : <DevMenu />;
}
