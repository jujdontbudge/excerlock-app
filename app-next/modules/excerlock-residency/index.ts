import { requireOptionalNativeModule } from 'expo';

export type ResidencyStatus = {
  wanted: boolean;
  running: boolean;
  session: boolean;
  sessionForeground: boolean;
  launchedForLocation: boolean;
  launchedInBackground: boolean;
  lastUpdateAt: number;
  availableMemoryMb: number;
};
type ResidencyModule = { setWanted(wanted: boolean, foreground: boolean): void; status(): ResidencyStatus };

export function getResidencyModule(): ResidencyModule | null {
  return requireOptionalNativeModule<ResidencyModule>('ExcerlockResidency');
}
