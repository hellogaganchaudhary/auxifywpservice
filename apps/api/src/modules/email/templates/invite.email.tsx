export const inviteEmailTemplate = (inviteUrl: string) => `
  <div style="font-family: Arial, sans-serif;">
    <h2>You’ve been invited</h2>
    <p>Click below to accept your invite:</p>
    <p><a href="${inviteUrl}">Accept invite</a></p>
  </div>
`;
