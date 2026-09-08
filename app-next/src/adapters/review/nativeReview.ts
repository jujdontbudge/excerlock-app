import * as StoreReview from 'expo-store-review';
import { Linking } from 'react-native';
import { writeReviewUrl } from '../appStore/links';

/** The only code that imports `expo-store-review`; `reviewPrompts` and the Rate row go through it. */
export type StoreReviewModule = {
  isAvailable(): Promise<boolean>;
  requestReview(): Promise<void>;
  openWriteReview(): Promise<void>;
};

export const nativeStoreReview: StoreReviewModule = {
  isAvailable: () => StoreReview.isAvailableAsync(),
  requestReview: () => StoreReview.requestReview(),
  openWriteReview: () => Linking.openURL(writeReviewUrl(StoreReview.storeUrl() ?? undefined)),
};
