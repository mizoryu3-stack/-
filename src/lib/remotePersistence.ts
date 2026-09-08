import type { WorkoutSession } from "./types";

/**
 * claude.ai上のArtifactとして開かれている場合、記録データはブラウザのlocalStorageだけでなく
 * Artifact本体 (公開ページ自身) にも永続化する。これにより、
 *  - コード更新のたびにブラウザ側のストレージがリセットされても記録が消えない
 *  - 同じURLを別のブラウザ・端末で開いても同じ記録が見える
 * ようになる。claude.aiの外 (GitHub Pagesなど静的ホスティング) で開かれた場合は
 * window.claude自体が存在しないため、常にlocalStorageのみにフォールバックする。
 */

const APP_STATE_ELEMENT_ID = "app-state";
const APP_TITLE = "筋トレ記録";

/** ビルド時に埋め込まれた<script id="app-state">から、直近に永続化された記録を読み出す。 */
export function readEmbeddedSessions(): WorkoutSession[] | null {
  if (typeof document === "undefined") return null;
  const el = document.getElementById(APP_STATE_ELEMENT_ID);
  if (!el?.textContent) return null;
  try {
    const parsed = JSON.parse(el.textContent);
    return Array.isArray(parsed) ? (parsed as WorkoutSession[]) : null;
  } catch {
    return null;
  }
}

/**
 * 公開しても差し支えない「置き換え用の完全なHTML」を組み立てる。
 * 生きているDOM (Reactが描画した#root配下やランタイムが注入した属性) はシリアライズせず、
 * 静的なCSS/JSソースをDOMから読み取り、状態(JSON)だけを差し替えた新しいドキュメントを
 * その都度組み立てる。
 */
export function buildPublishHtml(sessions: WorkoutSession[]): string {
  const styleContent = document.querySelector("style")?.textContent ?? "";
  const scriptContent =
    document.querySelector('script[type="module"]')?.textContent ?? "";
  // </script>等でタグが途切れないよう "<" はすべてエスケープする
  const stateJson = JSON.stringify(sessions).replace(/</g, "\\u003c");

  return `<!doctype html>
<meta charset="UTF-8" />
<title>${APP_TITLE}</title>
<style>${styleContent}</style>
<script type="application/json" id="${APP_STATE_ELEMENT_ID}">${stateJson}</script>
<div id="root"></div>
<script type="module">${scriptContent}</script>
`;
}

export interface ArtifactPublishResult {
  version: string;
}

export interface ArtifactNamespace {
  publish(html: string): Promise<ArtifactPublishResult>;
}

interface ClaudeGlobal {
  use: (name: string) => Promise<unknown>;
}

/** claude.ai上で動いている場合のみ、artifact capabilityを解決する (それ以外はnull)。 */
export async function resolveArtifactCapability(): Promise<ArtifactNamespace | null> {
  const w = window as unknown as { claude?: ClaudeGlobal };
  if (!w.claude || typeof w.claude.use !== "function") return null;
  try {
    const ns = await w.claude.use("artifact");
    return (ns as ArtifactNamespace | null) ?? null;
  } catch {
    return null;
  }
}
