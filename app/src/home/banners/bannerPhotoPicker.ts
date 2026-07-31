import * as ImagePicker from "expo-image-picker";

export type BannerPhotoPickResult =
  | { readonly status: "cancelled" }
  | { readonly status: "selected"; readonly uri: string };

export interface BannerPhotoPicker {
  pick: () => Promise<BannerPhotoPickResult>;
}

/** The only module that knows Expo Image Picker's API shape. */
export const expoBannerPhotoPicker: BannerPhotoPicker = {
  async pick() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [221, 100],
      quality: 0.85,
    });
    const asset = result.canceled ? undefined : result.assets[0];
    return asset === undefined
      ? { status: "cancelled" }
      : { status: "selected", uri: asset.uri };
  },
};
