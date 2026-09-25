import { useLocalSearchParams, useRouter } from 'expo-router';
import { previews } from './previews/registry';
import { ScreenShell, Heading, SettingsRow, SettingsGroup } from '../../ui';
import { previewCopy as c } from './previewsCopy';
export function PreviewGallery() {
  const { component, variant } = useLocalSearchParams<{
      component?: string;
      variant?: string;
    }>(),
    router = useRouter();
  const selected = previews.find((p) => p.name === component);
  if (selected) return selected.variants[variant === 'alternate' ? 1 : 0].element;
  return (
    <ScreenShell>
      <Heading title={c.gallery} support={c.intro} />
      <SettingsGroup>
        {previews.map((p) => (
          <SettingsRow
            key={p.name}
            title={p.name}
            onPress={() => router.push({ pathname: '/dev', params: { component: p.name } })}
          />
        ))}
      </SettingsGroup>
    </ScreenShell>
  );
}
