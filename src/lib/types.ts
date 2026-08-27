import type { Property, SimulationInput } from "@/generated/prisma/client";

export type PropertyWithRelations = Property & {
  simulationInput: SimulationInput | null;
  favorite?: { id: number } | null;
};

export interface SearchFilters {
  area?: string;
  rentMax?: number;
  buildingType?: "HOUSE" | "APARTMENT";
  areaSqmMin?: number;
  maxAge?: number;
  stationWalkMax?: number;
  hasParking?: boolean;
  depositMax?: number;
  keyMoneyMax?: number;
}
