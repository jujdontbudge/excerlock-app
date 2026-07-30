import { PixelRatio } from "react-native";
import { captureRef } from "react-native-view-shot";

import { SHARE_CARD_FORMATS } from "./ShareCardFormat";
import type {
  CapturedShareCard,
  CaptureShareCardRequest,
  ShareCardHandoffResult,
  ShareCardModule,
} from "./ShareCardModule";

/** Production adapter for capturing a mounted share card and sharing its PNG. */
export class NativeShareCardModule implements ShareCardModule {
  public async captureCard(
    request: CaptureShareCardRequest,
  ): Promise<CapturedShareCard> {
    const format = SHARE_CARD_FORMATS[request.ratio];
    const pixelRatio = PixelRatio.get();
    const fileUri = await captureRef(request.target, {
      format: "png",
      result: "tmpfile",
      width: format.width / pixelRatio,
      height: format.height / pixelRatio,
    });

    return Object.freeze({
      fileUri,
      mediaType: "image/png" as const,
      template: request.template,
      ratio: request.ratio,
      width: format.width,
      height: format.height,
    });
  }

  public async presentShareSheet(
    _card: CapturedShareCard,
  ): Promise<ShareCardHandoffResult> {
    throw new Error("Native share-sheet handoff is not implemented.");
  }
}
