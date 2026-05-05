import { Injectable } from "@nestjs/common";
import { Resend } from "resend";
import { inviteEmailTemplate } from "./templates/invite.email";
import { resetPasswordEmailTemplate } from "./templates/reset-password.email";

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
      html: resetPasswordEmailTemplate(resetUrl),
    });
  }

  async sendOnboardingEmail(to: string, params: { name: string; organizationName: string; setupUrl: string }) {
    if (!this.resend) {
      return { skipped: true };
    }
    return this.resend.emails.send({
      from: process.env.EMAIL_FROM || "Auxify Engage <no-reply@auxify.live>",
      to,
      subject: `Welcome to ${params.organizationName} on Auxify Engage`,
      html: `
        <div style="margin:0;background:#f7faff;padding:32px;font-family:Inter,Arial,sans-serif;color:#0b1b3a">
          <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:22px;overflow:hidden;box-shadow:0 10px 28px rgba(15,23,42,0.06)">
            <div style="padding:28px 32px;border-bottom:1px solid #e2e8f0;background:linear-gradient(135deg,#ffffff,#eef6ff)">
              <div style="font-size:24px;font-weight:900;letter-spacing:-0.04em;color:#0b1b3a">Auxify</div>
              <div style="font-size:11px;font-weight:800;letter-spacing:0.24em;text-transform:uppercase;color:#1683ff">Engage</div>
            </div>
            <div style="padding:32px">
              <p style="margin:0 0 10px;font-size:12px;font-weight:800;letter-spacing:0.22em;text-transform:uppercase;color:#1683ff">Workspace onboarding</p>
              <h1 style="margin:0;font-size:30px;line-height:1.15;letter-spacing:-0.04em;color:#0b1b3a">Welcome, ${params.name}.</h1>
              <p style="margin:18px 0 0;color:#475569;font-size:15px;line-height:1.7">Your ${params.organizationName} workspace is ready. Set your password, sign in, and complete the WhatsApp Business setup from your dashboard.</p>
              <a href="${params.setupUrl}" style="display:inline-block;margin-top:26px;border-radius:999px;background:#1683ff;color:#ffffff;text-decoration:none;padding:13px 20px;font-weight:800;font-size:14px">Set password and start onboarding</a>
              <p style="margin:24px 0 0;color:#64748b;font-size:12px;line-height:1.6">This secure link expires automatically. If it expires, use Forgot password on the login page.</p>
            </div>
          </div>
        </div>
      `,
    });
  }
}
