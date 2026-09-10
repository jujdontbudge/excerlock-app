import { requireNativeModule } from 'expo';
type StartupModule = { markInteractiveHome(): boolean };
export default requireNativeModule<StartupModule>('ExcerlockStartup');
