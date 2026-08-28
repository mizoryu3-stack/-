"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ingestProperty } from "@/lib/ingestion/ingestProperty";
import { validateRawListing, type RawListingInput, type ListingStatusInput } from "@/lib/ingestion/types";
import { importCsv } from "@/lib/ingestion/csv/importCsv";
import { SUPPORTED_PREFECTURE } from "@/lib/regions";

export interface FormState {
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

/**
 * 管理画面(/admin/properties/new)からの手動登録。STEP1。
 * useActionState と組み合わせて使う想定（成功時は redirect、失敗時は errors を返す）。
 */
export async function createPropertyManually(_prevState: FormState, formData: FormData): Promise<FormState> {
  const errors: string[] = [];

  const name = str(formData, "name");
  const address = str(formData, "address");
  const city = str(formData, "city");
  const rent = num(formData, "rent");
  const areaSqm = num(formData, "areaSqm");
  const builtYear = num(formData, "builtYear");
  const buildingType = str(formData, "buildingType");
  const stationWalkMin = num(formData, "stationWalkMin");
  const layout = str(formData, "layout");

  if (!name) errors.push("物件名は必須です");
  if (!address) errors.push("住所は必須です");
  if (!city) errors.push("市区町村は必須です");
  if (!layout) errors.push("間取りは必須です");
  if (rent === undefined || Number.isNaN(rent) || rent <= 0) errors.push("家賃が不正です");
  if (areaSqm === undefined || Number.isNaN(areaSqm) || areaSqm <= 0) errors.push("専有面積が不正です");
  if (builtYear === undefined || Number.isNaN(builtYear)) errors.push("築年が不正です");
  if (buildingType !== "HOUSE" && buildingType !== "APARTMENT") errors.push("物件種別が不正です");
  if (stationWalkMin === undefined || Number.isNaN(stationWalkMin) || stationWalkMin < 0)
    errors.push("駅徒歩が不正です");

  const latitude = num(formData, "latitude");
  if (latitude !== undefined && (Number.isNaN(latitude) || latitude < -90 || latitude > 90)) {
    errors.push("緯度が不正です");
  }
  const longitude = num(formData, "longitude");
  if (longitude !== undefined && (Number.isNaN(longitude) || longitude < -180 || longitude > 180)) {
    errors.push("経度が不正です");
  }

  const listingStatusRaw = str(formData, "listingStatus");
  const listingStatus: ListingStatusInput | undefined =
    listingStatusRaw === "ACTIVE" || listingStatusRaw === "ENDED" || listingStatusRaw === "UNKNOWN"
      ? listingStatusRaw
      : undefined;

  const firstSeenAtRaw = str(formData, "firstSeenAt");
  const lastCheckedAtRaw = str(formData, "lastCheckedAt");
  const firstSeenAt = firstSeenAtRaw ? new Date(firstSeenAtRaw) : undefined;
  const lastCheckedAt = lastCheckedAtRaw ? new Date(lastCheckedAtRaw) : undefined;
  if (firstSeenAt && Number.isNaN(firstSeenAt.getTime())) errors.push("初回確認日時が不正です");
  if (lastCheckedAt && Number.isNaN(lastCheckedAt.getTime())) errors.push("最終確認日時が不正です");

  if (errors.length > 0) {
    return { errors };
  }

  const raw: RawListingInput = {
    name: name!,
    prefecture: SUPPORTED_PREFECTURE,
    city: city!,
    address: address!,
    buildingType: buildingType as "HOUSE" | "APARTMENT",
    rent: rent!,
    managementFee: num(formData, "managementFee"),
    layout: layout!,
    areaSqm: areaSqm!,
    builtYear: builtYear!,
    stationName: str(formData, "stationName"),
    stationWalkMin: stationWalkMin!,
    hasParking: formData.get("hasParking") === "on",
    latitude,
    longitude,
    deposit: num(formData, "deposit"),
    keyMoney: num(formData, "keyMoney"),
    initialCost: num(formData, "initialCost"),
    photoUrl: str(formData, "photoUrl"),
    memo: str(formData, "memo"),
    source: str(formData, "source") ?? "admin",
    externalId: str(formData, "externalId"),
    sourceUrl: str(formData, "sourceUrl"),
    listingStatus,
    firstSeenAt,
    lastCheckedAt,
  };

  const validationErrors = validateRawListing(raw);
  if (validationErrors.length > 0) {
    return { errors: validationErrors.map((e) => `${e.field}: ${e.message}`) };
  }

  const result = await ingestProperty(raw);

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath(`/properties/${result.propertyId}`);

  redirect(`/properties/${result.propertyId}`);
}

export interface ImportFormState {
  error?: string;
}

/**
 * 管理画面(/admin/import)からのCSVインポート。STEP2〜5。
 * 成功時は結果表示ページへ redirect する。
 */
export async function importCsvAction(
  _prevState: ImportFormState,
  formData: FormData,
): Promise<ImportFormState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "CSVファイルを選択してください。" };
  }

  const text = await file.text();
  const summary = await importCsv(text, file.name || null);

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/duplicates");

  redirect(`/admin/import/${summary.batchId}`);
}
