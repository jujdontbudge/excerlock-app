import * as StoreReview from "expo-store-review";
import { Linking } from "react-native";

export interface NativeReviewModule {
  isAvailable: () => Promise<boolean>;
  requestReview: () => Promise<void>;
  openWriteReviewPage: () => Promise<boolean>;
}

export const nativeReviewModule: NativeReviewModule = {
  isAvailable: StoreReview.isAvailableAsync,
  requestReview: StoreReview.requestReview,
  async openWriteReviewPage() {
    const storeUrl = StoreReview.storeUrl();
    if (storeUrl === null) return false;
    await Linking.openURL(writeReviewUrl(storeUrl));
    return true;
  },
};

export function writeReviewUrl(storeUrl: string): string {
  const separator = storeUrl.includes("?") ? "&" : "?";
  return `${storeUrl}${separator}${
    storeUrl.includes("play.google.com") || storeUrl.startsWith("market:")
      ? "showAllReviews=true"
      : "action=write-review"
  }`;
}
