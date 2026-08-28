"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  VALID_MINPAKU_CONSULTATION_STATUSES,
  type MinpakuConsultationStatusInput,
} from "@/lib/ingestion/types";

export interface SavedSearchFormState {
  errors: string[];
}

function str(formData: FormData, key: string): string | undefined {
  const v = formData.get(key);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
}

function num(formData: FormData, key: string): number | undefined {
  const v = str(formData, key);
  if (v === undefined) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

function parseBuildingType(v: string | undefined): "HOUSE" | "APARTMENT" | undefined {
  if (v === "HOUSE" || v === "APARTMENT") return v;
  return undefined;
}

function parseMinpakuConsultationStatus(v: string | undefined): MinpakuConsultationStatusInput | undefined {
  if (v && (VALID_MINPAKU_CONSULTATION_STATUSES as string[]).includes(v)) {
    return v as MinpakuConsultationStatusInput;
  }
  return undefined;
}

interface SavedSearchFieldData {
  name: string | undefined;
  city: string | undefined;
  rentMax: number | undefined;
  buildingType: "HOUSE" | "APARTMENT" | undefined;
  areaSqmMin: number | undefined;
  maxAge: number | undefined;
  stationWalkMax: number | undefined;
  hasParking: boolean | undefined;
  minpakuConsultationStatus: MinpakuConsultationStatusInput | undefined;
  minMonthlyProfit: number | undefined;
}

function buildSavedSearchData(formData: FormData): SavedSearchFieldData {
  return {
    name: str(formData, "name"),
    city: str(formData, "city"),
    rentMax: num(formData, "rentMax"),
    buildingType: parseBuildingType(str(formData, "buildingType")),
    areaSqmMin: num(formData, "areaSqmMin"),
    maxAge: num(formData, "maxAge"),
    stationWalkMax: num(formData, "stationWalkMax"),
    hasParking: formData.get("hasParking") === "on" ? true : undefined,
    minpakuConsultationStatus: parseMinpakuConsultationStatus(str(formData, "minpakuConsultationStatus")),
    minMonthlyProfit: num(formData, "minMonthlyProfit"),
  };
}

export async function createSavedSearch(
  _prevState: SavedSearchFormState,
  formData: FormData,
): Promise<SavedSearchFormState> {
  const data = buildSavedSearchData(formData);
  if (!data.name) return { errors: ["検索条件の名前は必須です"] };
  for (const [field, value] of Object.entries(data)) {
    if (typeof value === "number" && Number.isNaN(value)) {
      return { errors: [`${field}の値が不正です`] };
    }
  }

  await prisma.savedSearch.create({ data: { ...data, name: data.name } });

  revalidatePath("/saved-searches");
  redirect("/saved-searches");
}

export async function updateSavedSearch(
  id: number,
  _prevState: SavedSearchFormState,
  formData: FormData,
): Promise<SavedSearchFormState> {
  const data = buildSavedSearchData(formData);
  if (!data.name) return { errors: ["検索条件の名前は必須です"] };
  for (const [field, value] of Object.entries(data)) {
    if (typeof value === "number" && Number.isNaN(value)) {
      return { errors: [`${field}の値が不正です`] };
    }
  }

  await prisma.savedSearch.update({
    where: { id },
    data: {
      ...data,
      name: data.name,
      // フォームで未指定(undefined)の項目は明示的にnullへ戻す（編集時に条件を外せるようにするため）
      city: data.city ?? null,
      rentMax: data.rentMax ?? null,
      buildingType: data.buildingType ?? null,
      areaSqmMin: data.areaSqmMin ?? null,
      maxAge: data.maxAge ?? null,
      stationWalkMax: data.stationWalkMax ?? null,
      hasParking: data.hasParking ?? null,
      minpakuConsultationStatus: data.minpakuConsultationStatus ?? null,
      minMonthlyProfit: data.minMonthlyProfit ?? null,
    },
  });

  revalidatePath("/saved-searches");
  redirect("/saved-searches");
}

export async function deleteSavedSearch(id: number) {
  await prisma.savedSearch.delete({ where: { id } });
  revalidatePath("/saved-searches");
}

export async function toggleSavedSearch(id: number, enabled: boolean) {
  await prisma.savedSearch.update({ where: { id }, data: { enabled } });
  revalidatePath("/saved-searches");
}
