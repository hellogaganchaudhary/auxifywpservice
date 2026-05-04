import { Injectable } from "@nestjs/common";
import { Resend } from "resend";

@Injectable()
export class EmailService {
  private readonly resend: Resend | null;

  constructor() {
    this.resend = process.env.RESEND_API_KEY
      ? new Resend(process.env.RESEND_API_KEY)
      : null;
  }

  async sendInviteEmail(to: string, inviteUrl: string) {
    if (!this.resend) {
      return { skipped: true };
    }
    return this.resend.emails.send({
      from: "WhatsAppAI <no-reply@whatsappai.dev>",
      to,
      subject: "You’ve been invited",
      html: `<p>You’ve been invited. <a href="${inviteUrl}">Accept invite</a></p>`,
    });
  }

  async sendResetEmail(to: string, resetUrl: string) {
    if (!this.resend) {
      return { skipped: true };
    }
    return this.resend.emails.send({
      from: "WhatsAppAI <no-reply@whatsappai.dev>",
      to,
      subject: "Reset your password",
      html: `<p>Reset your password: <a href="${resetUrl}">Reset</a></p>`,
    });
  }
}
