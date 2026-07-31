import {
  getCatalogEntry,
  type ActivityGroup,
  type CatalogId,
  type ConfiguredCondition,
} from "@excerlock/condition-model";
import type { ImageSource } from "expo-image";

export type CuratedBannerId =
  | "cycle-1" | "cycle-2" | "cycle-3"
  | "general-1" | "general-2" | "general-3" | "general-4" | "general-5"
  | "gym-1" | "gym-2" | "gym-3" | "gym-4"
  | "run-1" | "run-2" | "run-3"
  | "swim-1" | "swim-2" | "swim-3"
  | "walk-1" | "walk-2" | "walk-3";

export type BannerSelection =
  | { readonly kind: "curated"; readonly id: CuratedBannerId }
  | { readonly kind: "photo"; readonly uri: string };

export interface CuratedBanner {
  readonly id: CuratedBannerId;
  readonly label: string;
  readonly source: ImageSource;
}

const CURATED_BANNERS: Readonly<Record<CuratedBannerId, CuratedBanner>> = {
  "cycle-1": { id: "cycle-1", label: "Cycling banner 1", source: require("../../../../design/banners/cycle-1.png") },
  "cycle-2": { id: "cycle-2", label: "Cycling banner 2", source: require("../../../../design/banners/cycle-2.png") },
  "cycle-3": { id: "cycle-3", label: "Cycling banner 3", source: require("../../../../design/banners/cycle-3.png") },
  "general-1": { id: "general-1", label: "General banner 1", source: require("../../../../design/banners/general-1.png") },
  "general-2": { id: "general-2", label: "General banner 2", source: require("../../../../design/banners/general-2.png") },
  "general-3": { id: "general-3", label: "General banner 3", source: require("../../../../design/banners/general-3.png") },
  "general-4": { id: "general-4", label: "General banner 4", source: require("../../../../design/banners/general-4.png") },
  "general-5": { id: "general-5", label: "General banner 5", source: require("../../../../design/banners/general-5.png") },
  "gym-1": { id: "gym-1", label: "Gym banner 1", source: require("../../../../design/banners/gym-1.png") },
  "gym-2": { id: "gym-2", label: "Gym banner 2", source: require("../../../../design/banners/gym-2.png") },
  "gym-3": { id: "gym-3", label: "Gym banner 3", source: require("../../../../design/banners/gym-3.png") },
  "gym-4": { id: "gym-4", label: "Gym banner 4", source: require("../../../../design/banners/gym-4.png") },
  "run-1": { id: "run-1", label: "Running banner 1", source: require("../../../../design/banners/run-1.png") },
  "run-2": { id: "run-2", label: "Running banner 2", source: require("../../../../design/banners/run-2.png") },
  "run-3": { id: "run-3", label: "Running banner 3", source: require("../../../../design/banners/run-3.png") },
  "swim-1": { id: "swim-1", label: "Swimming banner 1", source: require("../../../../design/banners/swim-1.png") },
  "swim-2": { id: "swim-2", label: "Swimming banner 2", source: require("../../../../design/banners/swim-2.png") },
  "swim-3": { id: "swim-3", label: "Swimming banner 3", source: require("../../../../design/banners/swim-3.png") },
  "walk-1": { id: "walk-1", label: "Walking banner 1", source: require("../../../../design/banners/walk-1.png") },
  "walk-2": { id: "walk-2", label: "Walking banner 2", source: require("../../../../design/banners/walk-2.png") },
  "walk-3": { id: "walk-3", label: "Walking banner 3", source: require("../../../../design/banners/walk-3.png") },
};

const IDS_BY_ACTIVITY: Readonly<Record<ActivityGroup, readonly CuratedBannerId[]>> = {
  cycling: ["cycle-1", "cycle-2", "cycle-3"],
  connected: ["general-1", "gym-1", "swim-1"],
  gym: ["gym-1", "gym-2", "gym-3", "gym-4"],
  running: ["run-1", "run-2", "run-3"],
  swimming: ["swim-1", "swim-2", "swim-3"],
  universal: ["general-1", "general-2", "general-3", "general-4", "general-5"],
  walking: ["walk-1", "walk-2", "walk-3"],
};

export function curatedBannersForCatalog(catalogId: CatalogId): readonly CuratedBanner[] {
  return IDS_BY_ACTIVITY[getCatalogEntry(catalogId).activity].map((id) => CURATED_BANNERS[id]);
}

export function defaultBannerForCatalog(catalogId: CatalogId): BannerSelection {
  return { kind: "curated", id: curatedBannersForCatalog(catalogId)[0]!.id };
}

export function bannerForCondition(
  condition: ConfiguredCondition,
  saved?: BannerSelection,
): BannerSelection {
  return saved ?? defaultBannerForCatalog(condition.catalogId);
}

export function bannerSource(selection: BannerSelection): ImageSource {
  return selection.kind === "photo" ? { uri: selection.uri } : CURATED_BANNERS[selection.id].source;
}

export function isBannerSelection(value: unknown): value is BannerSelection {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<BannerSelection>;
  return candidate.kind === "photo"
    ? typeof candidate.uri === "string" && candidate.uri.length > 0
    : candidate.kind === "curated" &&
        typeof candidate.id === "string" &&
        candidate.id in CURATED_BANNERS;
}
