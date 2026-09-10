import { FakeAppPicker } from '../sheets/FakeAppPicker';
import { FakeSystemPrompt } from '../../design-system';
import { useDevSnapshot } from '../../state/selectors';
import { useRuntime } from '../../runtime/AppRuntimeProvider';
import { permissionCopy, alwaysLocationCopy } from '../../content/permissions';
export function FakePromptHost() {
  const { prompt } = useDevSnapshot(),
    runtime = useRuntime(),
    dev = runtime.dev;
  if (!__DEV__ || !dev) return null;
  if (prompt?.kind === 'picker')
    return <FakeAppPicker initial={prompt.initial} onResolve={dev.resolvePrompt} />;
  if (prompt?.kind !== 'permission') return null;
  return (
    <FakeSystemPrompt
      {...(prompt.scope === 'always' ? alwaysLocationCopy : permissionCopy[prompt.name])}
      onResolve={dev.resolvePrompt}
    />
  );
}
