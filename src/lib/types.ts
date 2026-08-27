import type {
  Property,
  SimulationInput,
  NearbyAttraction,
  CompetitorListing,
} from "@/generated/prisma/client";

export type PropertyWithRelations = Property & {
  simulationInput: SimulationInput | null;
  favorite?: { id: number } | null;
  nearbyAttractions?: NearbyAttraction[];
  competitors?: CompetitorListing[];
};

export const SORT_OPTIONS = [
  { value: "score", label: "民泊適性スコア順" },
  { value: "profit", label: "想定利益順" },
  { value: "rentAsc", label: "家賃が安い順" },
  { value: "newest", label: "新着順" },
] as const;

export type SortValue = (typeof SORT_OPTIONS)[number]["value"];

export interface SearchFilters {
  city?: string;
  rentMax?: number;
  buildingType?: "HOUSE" | "APARTMENT";
  layout?: string;
  areaSqmMin?: number;
  maxAge?: number;
  stationWalkMax?: number;
  hasParking?: boolean;
  depositMax?: number;
  keyMoneyMax?: number;
  sort: SortValue;
}
