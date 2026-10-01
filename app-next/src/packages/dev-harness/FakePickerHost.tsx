import { FakeAppPicker } from '../app-selection/FakeAppPicker';
import { useDevSnapshot } from '../lock/selectors';
import { useRuntime } from '../ports/useRuntime';

export function FakePickerHost() {
  const { prompt } = useDevSnapshot(), dev = useRuntime().dev;
  return prompt?.kind === 'picker' && dev ? <FakeAppPicker initial={prompt.initial} onResolve={dev.resolvePrompt} /> : null;
}
