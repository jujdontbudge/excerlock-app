import { ComponentType } from 'react';
import { GaitVisionProvider } from './GaitVisionProvider';
export interface GaitPort extends GaitVisionProvider {
  Preview: ComponentType;
  permission(): Promise<'granted' | 'denied'>;
}
