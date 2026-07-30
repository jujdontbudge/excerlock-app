import * as Sharing from "expo-sharing";
import { createRef } from "react";
import { PixelRatio, type View } from "react-native";
import { captureRef } from "react-native-view-shot";

import { NativeShareCardModule } from "../NativeShareCardModule";

jest.mock("react-native-view-shot", () => ({
  captureRef: jest.fn(),
}));

jest.mock("expo-sharing", () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}));

const mockCaptureRef = jest.mocked(captureRef);
const mockIsAvailableAsync = jest.mocked(Sharing.isAvailableAsync);
const mockShareAsync = jest.mocked(Sharing.shareAsync);

describe("NativeShareCardModule", () => {
  beforeEach(() => {
    jest.spyOn(PixelRatio, "get").mockReturnValue(3);
    mockCaptureRef.mockReset();
    mockIsAvailableAsync.mockReset();
    mockShareAsync.mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each([
    {
      ratio: "story" as const,
      fileUri: "file:///tmp/recap-story.png",
      logicalWidth: 360,
      logicalHeight: 640,
      pixelWidth: 1_080,
      pixelHeight: 1_920,
    },
    {
      ratio: "feed" as const,
      fileUri: "file:///tmp/recap-feed.png",
      logicalWidth: 360,
      logicalHeight: 360,
      pixelWidth: 1_080,
      pixelHeight: 1_080,
    },
  ])(
    "captures the $ratio target as an exact-size temporary PNG",
    async ({
      ratio,
      fileUri,
      logicalWidth,
      logicalHeight,
      pixelWidth,
      pixelHeight,
    }) => {
      const target = createRef<View>();
      mockCaptureRef.mockResolvedValueOnce(fileUri);
      const module = new NativeShareCardModule();

      await expect(
        module.captureCard({ target, template: "recap", ratio }),
      ).resolves.toEqual({
        fileUri,
        mediaType: "image/png",
        template: "recap",
        ratio,
        width: pixelWidth,
        height: pixelHeight,
      });
      expect(mockCaptureRef).toHaveBeenCalledWith(target, {
        format: "png",
        result: "tmpfile",
        width: logicalWidth,
        height: logicalHeight,
      });
    },
  );

  it("does not present a share sheet when native sharing is unavailable", async () => {
    mockIsAvailableAsync.mockResolvedValueOnce(false);
    const module = new NativeShareCardModule();

    await expect(
      module.presentShareSheet({
        fileUri: "file:///tmp/recap-feed.png",
        mediaType: "image/png",
        template: "recap",
        ratio: "feed",
        width: 1_080,
        height: 1_080,
      }),
    ).rejects.toThrow("Native sharing is unavailable.");
    expect(mockShareAsync).not.toHaveBeenCalled();
  });
});
