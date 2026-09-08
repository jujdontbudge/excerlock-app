import { ComponentType } from 'react';
import { PermissionStatus } from '../domain/types';
import { GaitVisionProvider } from '../engine/signals/gait/GaitVisionProvider';
export interface GaitPort extends GaitVisionProvider {
  Preview: ComponentType;
  permission(): Promise<PermissionStatus>;
}
