import { AppState } from 'react-native';
import type { Runtime } from '../ports/Runtime';
import { GYM_CONFIRM_RECHECK_MS } from '../activity/gymFix';
export function startGymPresenceSync(runtime: Runtime) {
  let sampling = false;
  const sample = () => {
    if (sampling || AppState.currentState !== 'active') return;
    sampling = true;
    void runtime.gym.currentFix(false).catch(() => undefined).finally(() => { sampling = false; });
  };
  const app = AppState.addEventListener('change', (state) => { if (state === 'active') sample(); });
  const timer = setInterval(sample, GYM_CONFIRM_RECHECK_MS);
  sample();
  return () => { app.remove(); clearInterval(timer); };
}
