import { FakeSystemPrompt } from '../../design-system';
import { useDevSnapshot } from '../../state/selectors';
import { useRuntime } from '../../runtime/AppRuntimeProvider';
import { permissionCopy } from '../../content/permissions';
export function FakePromptHost() {
  const { prompt } = useDevSnapshot(),
    runtime = useRuntime();
  if (prompt?.kind !== 'permission') return null;
  return <FakeSystemPrompt {...permissionCopy[prompt.name]} onResolve={runtime.dev.resolvePrompt} />;
}
