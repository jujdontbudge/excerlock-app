import { requireOptionalNativeModule } from 'expo-modules-core';
type StartupModule = {
  markInteractiveHome(): boolean;
  markStartupStage(stage: string): boolean;
};
export default requireOptionalNativeModule<StartupModule>('ExcerlockStartup');
