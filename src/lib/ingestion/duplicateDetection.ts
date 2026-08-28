import { prisma } from "@/lib/prisma";
import type { Property } from "@/generated/prisma/client";
import type { RawListingInput } from "@/lib/ingestion/types";

/**
 * 重複判定ロジック。ingestProperty() から呼ばれる。
 *
 * 判定の優先順位:
 *   1. source + externalId の完全一致 → 確実な同一物件とみなし「更新」として扱う
 *   2. 同一 sourceUrl → 同様に確実な同一物件とみなし「更新」として扱う
 *   3. 上記で判定できない場合、住所・物件名の類似度や座標の近接度から「重複候補」を検出する。
 *      ただし自動では統合せず、常に新規作成した上で DuplicateCandidate として記録し、
 *      人がレビューする運用にする（誤マージのリスクを避けるため）。
 */

// --- 1〜2. 確実な一致判定 ---

export async function findConfidentMatch(raw: RawListingInput): Promise<Property | null> {
  if (raw.externalId) {
    const byExternalId = await prisma.property.findUnique({
      where: { source_externalId: { source: raw.source, externalId: raw.externalId } },
    });
    if (byExternalId) return byExternalId;
  }

  if (raw.sourceUrl) {
    const bySourceUrl = await prisma.property.findFirst({ where: { sourceUrl: raw.sourceUrl } });
    if (bySourceUrl) return bySourceUrl;
  }

  return null;
}

// --- 3. あいまい一致による重複候補検出 ---

export interface DuplicateCandidateMatch {
  property: Property;
  reason: string;
  similarity: number; // 0.0〜1.0の目安
}

const SIMILARITY_THRESHOLD = 0.6;
const NEARBY_METERS_THRESHOLD = 50;
/** 候補として記録する最大件数（大量ヒットによるスパムを防ぐ） */
const MAX_CANDIDATES = 3;

// 全角/半角・大文字小文字・空白・よくある表記ゆれの差を吸収するための簡易正規化
function normalizeText(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s　－―‐-]/g, "");
}

// レーベンシュタイン距離（編集距離）。外部ライブラリを使わず自前実装。
function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let previousRow = Array.from({ length: b.length + 1 }, (_, i) => i);

  for (let i = 0; i < a.length; i++) {
    const currentRow = [i + 1];
    for (let j = 0; j < b.length; j++) {
      const insertCost = currentRow[j] + 1;
      const deleteCost = previousRow[j + 1] + 1;
      const substituteCost = previousRow[j] + (a[i] === b[j] ? 0 : 1);
      currentRow.push(Math.min(insertCost, deleteCost, substituteCost));
    }
    previousRow = currentRow;
  }

  return previousRow[b.length];
}

/** 0.0（まったく異なる）〜1.0（完全一致）の類似度 */
function stringSimilarity(a: string, b: string): number {
  const normA = normalizeText(a);
  const normB = normalizeText(b);
  if (normA.length === 0 || normB.length === 0) return 0;
  const maxLen = Math.max(normA.length, normB.length);
  return 1 - levenshteinDistance(normA, normB) / maxLen;
}

/** 2点間の距離（メートル、球面近似のHaversine公式） */
function haversineDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000; // 地球半径(m)
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * externalId・sourceUrlで判定できない場合の重複候補検索。
 * 同一市区町村・同一建物種別に絞り込んだ上で、物件名/住所の類似度・座標の近接度を見る。
 */
export async function findDuplicateCandidates(raw: RawListingInput): Promise<DuplicateCandidateMatch[]> {
  const sameAreaProperties = await prisma.property.findMany({
    where: { city: raw.city, buildingType: raw.buildingType, listingStatus: { not: "ENDED" } },
  });

  const matches: DuplicateCandidateMatch[] = [];
  // 既に city（さらに言えば prefecture）で絞り込んでいるため、住所の先頭は
  // どのペアでも一致してしまう。それを含めたまま比較すると、番地が全く違っても
  // 類似度が不当に高くなってしまうため、先頭の都道府県+市区町村部分を除去してから比較する。
  const addressPrefix = `${raw.prefecture}${raw.city}`;
  const stripPrefix = (address: string) =>
    address.startsWith(addressPrefix) ? address.slice(addressPrefix.length) : address;
  const rawAddressRest = stripPrefix(raw.address);

  for (const candidate of sameAreaProperties) {
    const nameSimilarity = stringSimilarity(raw.name, candidate.name);
    const addressSimilarity = stringSimilarity(rawAddressRest, stripPrefix(candidate.address));
    const isNearby =
      raw.latitude != null &&
      raw.longitude != null &&
      candidate.latitude != null &&
      candidate.longitude != null &&
      haversineDistanceMeters(raw.latitude, raw.longitude, candidate.latitude, candidate.longitude) <=
        NEARBY_METERS_THRESHOLD;

    const similarity = Math.max(nameSimilarity, addressSimilarity, isNearby ? 0.9 : 0);
    if (similarity < SIMILARITY_THRESHOLD) continue;

    const reason = isNearby
      ? "座標が近接しています"
      : addressSimilarity >= nameSimilarity
        ? "住所が類似しています"
        : "物件名が類似しています";

    matches.push({ property: candidate, reason, similarity });
  }

  return matches.sort((a, b) => b.similarity - a.similarity).slice(0, MAX_CANDIDATES);
}
