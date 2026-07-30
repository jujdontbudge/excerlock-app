import { SHARE_CARD_FORMATS } from "./ShareCardFormat";
import type {
  CapturedShareCard,
  CaptureShareCardRequest,
  ShareCardHandoffResult,
  ShareCardModule,
} from "./ShareCardModule";

/** Deterministic local boundary used until Expo can add the native libraries. */
export class MockShareCardModule implements ShareCardModule {
  private readonly captured: CapturedShareCard[] = [];
  private readonly presented: CapturedShareCard[] = [];

  public async captureCard(
    request: CaptureShareCardRequest,
  ): Promise<CapturedShareCard> {
    const format = SHARE_CARD_FORMATS[request.ratio];
    const card = Object.freeze({
      fileUri: `mock://share-cards/${request.template}-${request.ratio}-${format.width}x${format.height}.png`,
      mediaType: "image/png" as const,
      template: request.template,
      ratio: request.ratio,
      width: format.width,
      height: format.height,
    });
    this.captured.push(card);
    return card;
  }

  public async presentShareSheet(
    card: CapturedShareCard,
  ): Promise<ShareCardHandoffResult> {
    this.presented.push(card);
    return Object.freeze({ status: "simulated", fileUri: card.fileUri });
  }

  /** Deterministic mock observation; not part of the app-facing interface. */
  public getCapturedCards(): readonly CapturedShareCard[] {
    return Object.freeze([...this.captured]);
  }

  /** Deterministic mock observation; not part of the app-facing interface. */
  public getPresentedCards(): readonly CapturedShareCard[] {
    return Object.freeze([...this.presented]);
  }
}
