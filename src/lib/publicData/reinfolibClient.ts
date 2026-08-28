/**
 * 国土交通省「不動産情報ライブラリ」APIへの低レベルなHTTPクライアント。
 *
 * - APIキーは環境変数 REINFOLIB_API_KEY から読む（コードに直書きしない）
 * - すべての呼び出しは例外を投げず、Result型（ok/エラー理由）で返す
 * - タイムアウト・非2xx・JSONパース失敗を個別にハンドリングする
 *
 * 参考: https://www.reinfolib.mlit.go.jp/help/apiManual/
 */

const BASE_URL = "https://www.reinfolib.mlit.go.jp/ex-api/external";
const TIMEOUT_MS = 5_000;

export type ReinfolibResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: "NO_API_KEY" | "TIMEOUT" | "HTTP_ERROR" | "PARSE_ERROR" | "NETWORK_ERROR"; detail?: string };

export function getReinfolibApiKey(): string | undefined {
  const key = process.env.REINFOLIB_API_KEY;
  return key && key.trim() !== "" ? key : undefined;
}

async function callReinfolibApi<T>(path: string): Promise<ReinfolibResult<T>> {
  const apiKey = getReinfolibApiKey();
  if (!apiKey) {
    return { ok: false, reason: "NO_API_KEY" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      headers: { "Ocp-Apim-Subscription-Key": apiKey },
      signal: controller.signal,
    });

    if (!response.ok) {
      return { ok: false, reason: "HTTP_ERROR", detail: `status ${response.status}` };
    }

    try {
      const data = (await response.json()) as T;
      return { ok: true, data };
    } catch {
      return { ok: false, reason: "PARSE_ERROR" };
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { ok: false, reason: "TIMEOUT" };
    }
    return { ok: false, reason: "NETWORK_ERROR", detail: error instanceof Error ? error.message : String(error) };
  } finally {
    clearTimeout(timeout);
  }
}

// --- XIT001: 不動産価格（取引・成約）情報 ---

export interface TransactionPriceRecord {
  Type?: string;
  TradePrice?: string;
  UnitPrice?: string;
  Area?: string;
  Prefecture?: string;
  Municipality?: string;
  Period?: string;
}

// レスポンスがトップレベル配列で返るか { data: [...] } でラップされて返るか、
// 二次情報源の記載が一致しなかったため、実装時点では両方の形に対応できるようにしておく。
function normalizeTransactionPriceResponse(raw: unknown): TransactionPriceRecord[] {
  if (Array.isArray(raw)) return raw as TransactionPriceRecord[];
  if (raw && typeof raw === "object" && Array.isArray((raw as { data?: unknown }).data)) {
    return (raw as { data: TransactionPriceRecord[] }).data;
  }
  return [];
}

export async function fetchTransactionPrices(
  cityCode: string,
  year: number,
  quarter: number,
): Promise<ReinfolibResult<TransactionPriceRecord[]>> {
  const params = new URLSearchParams({ year: String(year), quarter: String(quarter), city: cityCode });
  const result = await callReinfolibApi<unknown>(`/XIT001?${params.toString()}`);
  if (!result.ok) return result;
  return { ok: true, data: normalizeTransactionPriceResponse(result.data) };
}

// --- タイル座標ベースのGIS系API（用途地域・駅・災害リスク等）共通 ---

export interface GeoJsonFeatureCollection {
  type: "FeatureCollection";
  features: { type: "Feature"; properties: Record<string, unknown> }[];
}

export function fetchTileFeatures(
  endpointId: string,
  z: number,
  x: number,
  y: number,
): Promise<ReinfolibResult<GeoJsonFeatureCollection>> {
  const params = new URLSearchParams({ response_format: "geojson", z: String(z), x: String(x), y: String(y) });
  return callReinfolibApi<GeoJsonFeatureCollection>(`/${endpointId}?${params.toString()}`);
}
