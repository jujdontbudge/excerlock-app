import { ComponentType } from 'react';
import { GaitVisionProvider } from '../features/unlock/gait/GaitVisionProvider';
export interface GaitPort extends GaitVisionProvider {
  Preview: ComponentType;
  permission(): Promise<'granted' | 'denied'>;
}
