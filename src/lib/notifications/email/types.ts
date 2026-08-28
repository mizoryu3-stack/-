/**
 * メール送信のProvider/Adapter抽象。実際の送信手段（Resend等の外部サービス、ローカル開発用の
 * コンソール出力、テスト用のFake）を差し替え可能にするための最小限のインターフェース。
 *
 * 将来Resend等を導入する場合、この EmailAdapter を実装した新しいクラスを
 * src/lib/notifications/email/adapters/ に追加し、getEmailAdapter()（config.ts）の分岐を
 * 1つ増やすだけでよい。呼び出し側(notifyPropertyMatch.ts)は一切変更不要。
 */
export interface EmailMessage {
  to: string;
  subject: string;
  /** プレーンテキスト本文。最低限これだけあれば送信可能な形にしている（HTMLメール化は将来の拡張） */
  text: string;
}

export interface EmailSendResult {
  ok: boolean;
  /** ok:false の場合の理由（ログ・追跡用） */
  error?: string;
}

export interface EmailAdapter {
  send(message: EmailMessage): Promise<EmailSendResult>;
}
