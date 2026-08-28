import type { EmailAdapter } from "@/lib/notifications/email/types";
import { ConsoleEmailAdapter } from "@/lib/notifications/email/adapters/consoleAdapter";
import { fakeEmailAdapter } from "@/lib/notifications/email/adapters/fakeAdapter";

/**
 * 使用するメールアダプタを環境変数 EMAIL_PROVIDER から決定する。
 *
 * - 未設定（既定）: メール送信自体を行わない(null)。外部メールサービスをまだ契約して
 *   いない・設定していない状態で誤って送信を試みないよう、安全側のデフォルトにしている
 *   （/api/properties/ingest の INGEST_API_TOKEN、/api/cron/daily-search の
 *   CRON_API_TOKEN と同じ方針）。
 * - "console": ローカル開発・動作確認用。実際には送信せず、内容をコンソールに出力する。
 * - "fake": テスト専用。tests/ 配下からのみ使う想定（本番でこの値を設定しない）。
 *
 * 将来Resend等の実サービスを導入する場合は、ここに分岐を1つ追加し、対応するAdapterクラスを
 * src/lib/notifications/email/adapters/ に実装するだけでよい。呼び出し側
 * (notifyPropertyMatch.ts)は変更不要。
 */
export function getEmailAdapter(): EmailAdapter | null {
  const provider = process.env.EMAIL_PROVIDER;
  if (provider === "console") return new ConsoleEmailAdapter();
  if (provider === "fake") return fakeEmailAdapter;
  return null;
}

/**
 * 通知メールの送信先アドレスを返す。
 *
 * 認証機能・複数ユーザー対応は未実装（単一ユーザー前提。SavedSearch.userId等と同じ考え方）
 * のため、userIdによらず固定の環境変数 NOTIFICATION_EMAIL_TO から取得する。未設定の場合は
 * undefined を返し、呼び出し側で送信をスキップする。
 * 将来ログイン機能を追加する際、この関数を「実際のユーザーのメールアドレスを引く処理」に
 * 差し替えるだけで移行できる。
 */
export function getNotificationRecipientEmail(userId: string): string | undefined {
  void userId; // 将来ここでuserIdごとの宛先を引くまでの、意図的な未使用引数
  return process.env.NOTIFICATION_EMAIL_TO || undefined;
}
