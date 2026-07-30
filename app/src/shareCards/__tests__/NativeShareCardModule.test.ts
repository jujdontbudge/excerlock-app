import { createRef } from "react";
import { PixelRatio, type View } from "react-native";
import { captureRef } from "react-native-view-shot";

import { NativeShareCardModule } from "../NativeShareCardModule";

jest.mock("react-native-view-shot", () => ({
  captureRef: jest.fn(),
}));

const mockCaptureRef = jest.mocked(captureRef);

describe("NativeShareCardModule", () => {
  beforeEach(() => {
    jest.spyOn(PixelRatio, "get").mockReturnValue(3);
    mockCaptureRef.mockReset();
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
});
