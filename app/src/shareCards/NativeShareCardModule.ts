import * as Sharing from "expo-sharing";
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
    card: CapturedShareCard,
  ): Promise<ShareCardHandoffResult> {
    if (!(await Sharing.isAvailableAsync())) {
      throw new Error("Native sharing is unavailable.");
    }

    await Sharing.shareAsync(card.fileUri, { UTI: "public.png" });
    return Object.freeze({ status: "presented", fileUri: card.fileUri });
  }
}
