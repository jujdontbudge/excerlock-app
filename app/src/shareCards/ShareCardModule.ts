import type { RefObject } from "react";
import type { View } from "react-native";

import type { ShareCardRatio } from "./ShareCardFormat";

export type ShareCardTemplate = "milestone" | "recap";

export type CaptureShareCardRequest = Readonly<{
  /** Mounted ShareCardFrame ref; a real adapter passes it to view capture. */
  target: RefObject<View | null>;
  template: ShareCardTemplate;
  ratio: ShareCardRatio;
}>;

export type CapturedShareCard = Readonly<{
  fileUri: string;
  mediaType: "image/png";
  template: ShareCardTemplate;
  ratio: ShareCardRatio;
  width: number;
  height: number;
}>;

export type ShareCardHandoffResult = Readonly<{
  /** `simulated` is the honest result while the dependency-blocked mock is installed. */
  status: "simulated" | "presented" | "dismissed";
  fileUri: string;
}>;

/** Vendor-free boundary for the two dependency-blocked native operations. */
export interface ShareCardModule {
  captureCard(request: CaptureShareCardRequest): Promise<CapturedShareCard>;
  presentShareSheet(card: CapturedShareCard): Promise<ShareCardHandoffResult>;
}
