import type { EmailAdapter, EmailMessage, EmailSendResult } from "@/lib/notifications/email/types";

/**
 * テスト専用のメールアダプタ。実際には送信せず、送信内容をメモリ上に記録するだけ。
 * `EMAIL_PROVIDER=fake` のときに使われる（本番運用でこの値を設定することは想定していない。
 * config.ts の getEmailAdapter() 参照）。
 *
 * shouldFail を true にすると、送信失敗（外部サービス側のエラー等）をシミュレートできる。
 * 「メール送信が失敗してもPropertyMatch作成・物件登録自体は失敗しない」ことを検証する
 * テスト(tests/emailNotification.test.ts)で使用する。
 */
export class FakeEmailAdapter implements EmailAdapter {
  sentMessages: EmailMessage[] = [];
  shouldFail = false;

  async send(message: EmailMessage): Promise<EmailSendResult> {
    if (this.shouldFail) {
      return { ok: false, error: "テスト用の送信失敗シミュレーション" };
    }
    this.sentMessages.push(message);
    return { ok: true };
  }

  /** テストの beforeEach で呼び、前のテストの記録・失敗設定を持ち越さないようにする */
  reset(): void {
    this.sentMessages = [];
    this.shouldFail = false;
  }
}

/**
 * getEmailAdapter() が EMAIL_PROVIDER=fake のときに返す単一インスタンス。
 * テストコードから直接importして送信内容の確認・失敗シミュレーションの設定に使う。
 */
export const fakeEmailAdapter = new FakeEmailAdapter();
