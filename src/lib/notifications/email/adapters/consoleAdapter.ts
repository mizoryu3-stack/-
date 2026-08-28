import type { EmailAdapter, EmailMessage, EmailSendResult } from "@/lib/notifications/email/types";

/**
 * ローカル開発・動作確認用のメールアダプタ。
 * 実際には外部へ送信せず、内容をコンソールに出力するだけで、常に成功(ok:true)を返す。
 * `EMAIL_PROVIDER=console` を設定したときに使われる（config.ts の getEmailAdapter() 参照）。
 *
 * 外部メールサービスを契約していない段階でも、「どんな内容のメールが、いつ、誰宛てに
 * 送られるはずだったか」を手元で目視確認できるようにするためのもの。
 */
export class ConsoleEmailAdapter implements EmailAdapter {
  async send(message: EmailMessage): Promise<EmailSendResult> {
    console.info(
      `[email:console] to=${message.to} subject="${message.subject}"\n${message.text}\n[email:console] ----- ここまで -----`,
    );
    return { ok: true };
  }
}
