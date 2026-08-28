import type { Property, SavedSearch } from "@/generated/prisma/client";
import { formatYen, buildingTypeLabel, minpakuConsultationStatusLabel } from "@/lib/format";
import type { EmailMessage } from "@/lib/notifications/email/types";

const DEFAULT_APP_BASE_URL = "http://localhost:3000";

export interface BuildMatchEmailInput {
  to: string;
  property: Property;
  savedSearch: SavedSearch;
  /** 想定月間利益（円）。SimulationInputが無い等で算出できない場合はnull */
  monthlyProfit: number | null;
}

/**
 * 物件詳細ページへの絶対URLを組み立てる。
 * APP_BASE_URL未設定時は、まだデプロイ先が確定していないプロトタイプ段階を想定し、
 * ローカル開発用の既定値(http://localhost:3000)にフォールバックする。
 */
function buildPropertyUrl(propertyId: number): string {
  const base = process.env.APP_BASE_URL || DEFAULT_APP_BASE_URL;
  return `${base.replace(/\/$/, "")}/properties/${propertyId}`;
}

/**
 * 新着物件が保存検索条件に一致した際のメール本文を組み立てる（STEP8）。
 * 送信そのものは行わない純粋関数。内容は物件詳細画面と同じ情報源(Property/SavedSearch/
 * calculateSimulation()の結果)から作るため、画面とメールの表示が食い違うことがない。
 *
 * 含める項目（要件どおり最低限）: 物件名・所在地・家賃・面積・民泊相談状況・
 * 期待月間利益・民泊適性に関する主要情報（参考スコア）・物件詳細ページへのリンク。
 */
export function buildMatchEmailMessage(input: BuildMatchEmailInput): EmailMessage {
  const { property, savedSearch, monthlyProfit, to } = input;
  const url = buildPropertyUrl(property.id);

  const lines = [
    `保存検索条件「${savedSearch.name}」に一致する新着物件が見つかりました。`,
    "",
    `物件名: ${property.name}`,
    `所在地: ${property.address}`,
    `家賃: ${formatYen(property.rent)}`,
    `面積: ${property.areaSqm}m²`,
    `建物種別: ${buildingTypeLabel[property.buildingType]}`,
    `民泊利用について: ${minpakuConsultationStatusLabel[property.minpakuConsultationStatus]}`,
    `民泊適性スコア（参考値）: ${property.minpakuScore}点`,
    monthlyProfit !== null
      ? `想定月間利益（参考値）: ${formatYen(monthlyProfit)}`
      : "想定月間利益: 算出できませんでした",
    "",
    `物件詳細はこちら: ${url}`,
    "",
    "※民泊適性スコア・想定月間利益はいずれもプロトタイプの仮ロジックによる参考値です。" +
      "法的な民泊可否・実際の収益を保証するものではありません。",
  ];

  return {
    to,
    subject: `【民泊物件サーチ】新着物件のお知らせ: ${property.name}`,
    text: lines.join("\n"),
  };
}
