import { createRef } from "react";
import type { View } from "react-native";

import { SHARE_CARD_FORMATS, type ShareCardModule } from "..";
import { MockShareCardModule } from "../MockShareCardModule";

describe("MockShareCardModule", () => {
  it("deterministically captures the requested format and simulates its share handoff", async () => {
    const mock = new MockShareCardModule();
    const module: ShareCardModule = mock;
    const target = createRef<View>();

    const captured = await module.captureCard({
      target,
      template: "recap",
      ratio: "story",
    });

    expect(captured).toEqual({
      fileUri: "mock://share-cards/recap-story-1080x1920.png",
      mediaType: "image/png",
      template: "recap",
      ratio: "story",
      width: 1_080,
      height: 1_920,
    });
    await expect(module.presentShareSheet(captured)).resolves.toEqual({
      status: "simulated",
      fileUri: captured.fileUri,
    });
    expect(mock.getCapturedCards()).toEqual([captured]);
    expect(mock.getPresentedCards()).toEqual([captured]);
    expect(SHARE_CARD_FORMATS.story.aspectRatio).toBe(9 / 16);
  });
});
