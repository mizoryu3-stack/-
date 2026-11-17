import type { Item } from "./types";

function normalize(s: string | null | undefined): string {
  return (s ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s　・\-_/()（）【】\[\]「」,，.。]/g, "");
}

function normalizeUrl(u: string | null | undefined): string {
  if (!u) return "";
  try {
    const url = new URL(u);
    // Amazon の /dp/XXXX を優先して比較
    const asin = url.pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
    if (asin) return `amazon:${asin[1].toUpperCase()}`;
    return `${url.hostname.replace(/^www\./, "")}${url.pathname.replace(/\/$/, "")}`;
  } catch {
    return u.trim();
  }
}

export interface DuplicateHit {
  item: Item;
  reason: string;
}

/** 名前・URL・型番・スクリーンショットのハッシュから重複の可能性を検出 */
export function findDuplicates(
  candidate: { name?: string | null; original_name?: string | null; url?: string | null; model_number?: string | null; screenshot_hash?: string | null },
  items: Item[],
  excludeId?: string,
): DuplicateHit[] {
  const hits: DuplicateHit[] = [];
  const cName = normalize(candidate.name);
  const cOrig = normalize(candidate.original_name);
  const cUrl = normalizeUrl(candidate.url);
  const cModel = normalize(candidate.model_number);
  for (const it of items) {
    if (it.id === excludeId || it.status === "cancelled") continue;
    let reason = "";
    if (cUrl && cUrl === normalizeUrl(it.url)) reason = "同じ商品URL";
    else if (cModel && cModel.length >= 4 && cModel === normalize(it.model_number)) reason = "同じ型番";
    else if (cOrig && cOrig.length >= 6 && cOrig === normalize(it.original_name)) reason = "同じ商品名";
    else if (cName && cName === normalize(it.name)) reason = "同じ商品名";
    else if (candidate.screenshot_hash && candidate.screenshot_hash === it.screenshot_hash) reason = "同じスクリーンショット";
    if (reason) hits.push({ item: it, reason });
  }
  return hits;
}
