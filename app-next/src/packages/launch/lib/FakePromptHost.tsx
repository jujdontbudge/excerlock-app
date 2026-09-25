import { FakeAppPicker } from '../../app-selection/FakeAppPicker';
import { FakeSystemPrompt } from '../../ui';
import { useDevSnapshot } from '../../lock/selectors';
import { permissionsStore as usePermissionsStore } from '../../permissions/permissionsStore';
import { useRuntime } from '../../ports/useRuntime';
import { systemAlert } from '../../permissions/systemAlerts';
export function FakePromptHost() {
  const { prompt } = useDevSnapshot(),
    runtime = useRuntime(),
    location = usePermissionsStore((s) => s.data.location),
    dev = runtime.dev;
  if (!__DEV__ || !dev) return null;
  if (prompt?.kind === 'picker') return <FakeAppPicker initial={prompt.initial} onResolve={dev.resolvePrompt} />;
  if (prompt?.kind !== 'permission') return null;
  return (
    <FakeSystemPrompt
      alert={systemAlert(prompt.name, prompt.scope === 'always', location)}
      onResolve={dev.resolvePrompt}
    />
  );
}
