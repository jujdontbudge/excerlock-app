import { embeddedRuntimeVersion } from '../../updates/updates';

export const ratingStepShown = ['4', '5'].includes(embeddedRuntimeVersion() ?? '');
