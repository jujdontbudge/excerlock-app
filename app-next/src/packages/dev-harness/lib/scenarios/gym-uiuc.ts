import { base, makeRule } from './base';
import type { SavedPlace } from '../../../model/models';
export const uiucGym: SavedPlace = { id: 'gym-uiuc', name: 'UIUC gym', address: 'Urbana, Illinois', latitude: 40.1095, longitude: -88.2272, radiusMeters: 100 };
const gymRule = makeRule('gym', { kind: 'event', activity: 'gym', trigger: 'arrival' });
export const gymUiucOutside = base('gym-uiuc-outside', 'Gym · UIUC outside', { rules: [gymRule], ruleDays: [], gym: { places: [{ ...uiucGym, latitude: 40.1135 }], presence: 'outside', backgroundAsked: true, optOut: true } });
export const gymUiucManual = base('gym-uiuc-manual', 'Gym · UIUC manual', { rules: [gymRule], ruleDays: [], gym: { places: [uiucGym], presence: 'inside', backgroundAsked: true, optOut: true } });
