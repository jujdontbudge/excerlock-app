import { requireOptionalNativeModule } from 'expo-modules-core';
type StartupModule = { markInteractiveHome(): boolean };
export default requireOptionalNativeModule<StartupModule>('ExcerlockStartup');
