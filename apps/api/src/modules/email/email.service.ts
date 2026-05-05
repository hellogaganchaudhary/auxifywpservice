import { Injectable } from "@nestjs/common";
import { Resend } from "resend";
import { inviteEmailTemplate } from "./templates/invite.email";

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
      from: process.env.EMAIL_FROM || "Auxify Engage <no-reply@auxify.live>",
      to,
      subject: "You’ve been invited to Auxify Engage",
      html: inviteEmailTemplate(inviteUrl),
    });
  }

  async sendResetEmail(to: string, resetUrl: string) {
    if (!this.resend) {
      return { skipped: true };
    }
    return this.resend.emails.send({
      from: process.env.EMAIL_FROM || "Auxify Engage <no-reply@auxify.live>",
      to,
      subject: "Reset your Auxify Engage password",
      html: `<div style="font-family:Inter,Arial,sans-serif;background:#f7faff;padding:32px;color:#0b1b3a"><div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:18px;padding:32px"><h1 style="margin:0 0 12px;font-size:24px">Reset your password</h1><p style="color:#475569;line-height:1.6">Use the secure link below to reset your Auxify Engage password.</p><a href="${resetUrl}" style="display:inline-block;margin-top:16px;background:#1683ff;color:white;text-decoration:none;padding:12px 18px;border-radius:999px;font-weight:700">Reset password</a></div></div>`,
    });
  }
}
