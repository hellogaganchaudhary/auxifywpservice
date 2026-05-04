export const resetPasswordEmailTemplate = (resetUrl: string) => `
  <div style="font-family: Arial, sans-serif;">
    <h2>Reset your password</h2>
    <p>Click below to reset your password:</p>
    <p><a href="${resetUrl}">Reset password</a></p>
  </div>
`;
