export const inviteEmailTemplate = (inviteUrl: string) => `
  <div style="margin:0;background:#f7faff;padding:32px;font-family:Inter,Arial,sans-serif;color:#0b1b3a">
    <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:22px;overflow:hidden;box-shadow:0 10px 28px rgba(15,23,42,0.06)">
      <div style="padding:28px 32px;border-bottom:1px solid #e2e8f0;background:linear-gradient(135deg,#ffffff,#eef6ff)">
        <div style="font-size:24px;font-weight:900;letter-spacing:-0.04em;color:#0b1b3a">Auxify</div>
        <div style="font-size:11px;font-weight:800;letter-spacing:0.24em;text-transform:uppercase;color:#1683ff">Engage</div>
      </div>
      <div style="padding:32px">
        <p style="margin:0 0 10px;font-size:12px;font-weight:800;letter-spacing:0.22em;text-transform:uppercase;color:#1683ff">Workspace invitation</p>
        <h1 style="margin:0;font-size:30px;line-height:1.15;letter-spacing:-0.04em;color:#0b1b3a">You’ve been invited to Auxify Engage.</h1>
        <p style="margin:18px 0 0;color:#475569;font-size:15px;line-height:1.7">A workspace administrator created your profile. Accept this invitation to set your password, join the organization, and connect your team’s WhatsApp Business credentials when ready.</p>
        <a href="${inviteUrl}" style="display:inline-block;margin-top:26px;border-radius:999px;background:#1683ff;color:#ffffff;text-decoration:none;padding:13px 20px;font-weight:800;font-size:14px">Accept invitation</a>
        <p style="margin:24px 0 0;color:#64748b;font-size:12px;line-height:1.6">This secure invitation expires automatically. If you did not expect this email, you can ignore it.</p>
      </div>
    </div>
  </div>
`;
