import type { Property, PropertyMatch, SavedSearch } from "@/generated/prisma/client";
import { getEmailAdapter, getNotificationRecipientEmail } from "@/lib/notifications/email/config";
import { buildMatchEmailMessage } from "@/lib/notifications/email/buildMatchEmail";

export interface NotifyPropertyMatchInput {
  match: PropertyMatch;
  property: Property;
  savedSearch: SavedSearch;
  monthlyProfit: number | null;
}

/**
 * 新規作成された PropertyMatch（＝アプリ内通知）を、有効な通知チャネルへ配信する（STEP8）。
 *
 * 現時点ではメール通知のみ実装している。将来Push通知等を追加する場合、この関数の中に
 * sendMatchPush(input) 相当の呼び出しをメールと並べて追加すればよい構造にしている
 * （チャネルごとの実装を src/lib/notifications/email/ のような独立したディレクトリに
 * 分離してあるため、他チャネルの追加が既存コードに影響しない）。
 *
 * この関数自体は例外を投げない設計（内部で必ずcatchする）。呼び出し元
 * (matchSavedSearches.ts)でも念のため .catch() しており、通知処理の失敗が
 * PropertyMatch作成・物件登録に影響することは絶対にない
 * （src/lib/publicData/enrichProperty.ts の「例外を投げない設計＋念のため二重に保護」と
 * 同じ方針）。
 */
export async function notifyPropertyMatch(input: NotifyPropertyMatchInput): Promise<void> {
  await sendMatchEmail(input).catch((error: unknown) => {
    console.warn(
      `[email] 通知処理中に予期しないエラーが発生しました(propertyMatchId=${input.match.id}):`,
      error,
    );
  });
}

async function sendMatchEmail(input: NotifyPropertyMatchInput): Promise<void> {
  const adapter = getEmailAdapter();
  if (!adapter) {
    console.info(
      `[email] EMAIL_PROVIDER未設定のため送信をスキップしました（propertyMatchId=${input.match.id}）`,
    );
    return;
  }

  const to = getNotificationRecipientEmail(input.savedSearch.userId);
  if (!to) {
    console.info(
      `[email] NOTIFICATION_EMAIL_TO未設定のため送信をスキップしました（propertyMatchId=${input.match.id}）`,
    );
    return;
  }

  const message = buildMatchEmailMessage({
    to,
    property: input.property,
    savedSearch: input.savedSearch,
    monthlyProfit: input.monthlyProfit,
  });

  const result = await adapter.send(message);
  if (result.ok) {
    console.info(`[email] 送信成功: propertyMatchId=${input.match.id} to=${to}`);
  } else {
    console.warn(
      `[email] 送信失敗: propertyMatchId=${input.match.id} to=${to} reason=${result.error ?? "不明"}`,
    );
  }
}
