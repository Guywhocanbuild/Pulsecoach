const { Resend } = require("resend");

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Fire-and-log: email failures should never break the auth flow itself.
const sendEmail = async ({ to, subject, html }) => {
  if (!resend) {
    console.warn(`RESEND_API_KEY not set — skipping email "${subject}" to ${to}`);
    return;
  }

  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM || "PulseCoach <onboarding@resend.dev>",
      to,
      subject,
      html
    });
  } catch (error) {
    console.error("Failed to send email:", error.message);
  }
};

// Shared email chrome — table-based layout since email clients don't
// reliably support flexbox/grid. Inline styles only; no external fonts.
const emailShell = ({ preheader, bodyHtml }) => `
<!DOCTYPE html>
<html>
<body style="margin:0; padding:0; background-color:#EAEBF0; -webkit-font-smoothing:antialiased;">
  <div style="display:none; max-height:0; overflow:hidden;">${preheader}</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#EAEBF0; padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px; width:100%; background-color:#FFFFFF; border-radius:20px; overflow:hidden; box-shadow:0 1px 2px rgba(16,19,26,0.04);">

          <!-- Pulse header bar -->
          <tr>
            <td style="background-color:#10131A; padding:28px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-right:10px;">
                    <div style="width:10px; height:10px; border-radius:50%; background-color:#FF4B6E;"></div>
                  </td>
                  <td>
                    <span style="font-family:Helvetica,Arial,sans-serif; font-size:18px; font-weight:700; color:#FFFFFF; letter-spacing:-0.02em;">PulseCoach</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Thin pulse accent line -->
          <tr>
            <td style="height:3px; background-color:#FF4B6E; line-height:3px; font-size:0;">&nbsp;</td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 32px;">
              ${bodyHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px; background-color:#F3F3F7; border-top:1px solid #E4E5EA;">
              <p style="margin:0; font-family:Helvetica,Arial,sans-serif; font-size:12px; color:#6E7385;">
                PulseCoach — your vitals, read in plain language.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

const welcomeEmail = (name) => emailShell({
  preheader: `Welcome to PulseCoach, ${name} — your account is ready.`,
  bodyHtml: `
    <h1 style="margin:0 0 12px; font-family:Helvetica,Arial,sans-serif; font-size:22px; font-weight:700; color:#10131A; letter-spacing:-0.02em;">
      Welcome, ${name} 👋
    </h1>
    <p style="margin:0 0 24px; font-family:Helvetica,Arial,sans-serif; font-size:15px; line-height:1.6; color:#3A3F4B;">
      Your account is set up. Log in, load your health data — or hit
      <strong>"Load demo data"</strong> to try it instantly — and start chatting with your coach.
    </p>

    <table role="presentation" cellpadding="0" cellspacing="0">
      <tr>
        <td style="border-radius:10px; background-color:#10131A;">
          <a href="${process.env.CLIENT_URL || "http://localhost:5001"}"
             style="display:inline-block; padding:12px 24px; font-family:Helvetica,Arial,sans-serif; font-size:14px; font-weight:600; color:#FFFFFF; text-decoration:none;">
            Open PulseCoach →
          </a>
        </td>
      </tr>
    </table>
  `
});

const resetPasswordEmail = (resetUrl) => emailShell({
  preheader: "Reset your PulseCoach password — this link expires in 15 minutes.",
  bodyHtml: `
    <h1 style="margin:0 0 12px; font-family:Helvetica,Arial,sans-serif; font-size:22px; font-weight:700; color:#10131A; letter-spacing:-0.02em;">
      Reset your password
    </h1>
    <p style="margin:0 0 24px; font-family:Helvetica,Arial,sans-serif; font-size:15px; line-height:1.6; color:#3A3F4B;">
      Click below to set a new password. This link expires in <strong>15 minutes</strong>.
    </p>

    <table role="presentation" cellpadding="0" cellspacing="0">
      <tr>
        <td style="border-radius:10px; background-color:#FF4B6E;">
          <a href="${resetUrl}"
             style="display:inline-block; padding:12px 24px; font-family:Helvetica,Arial,sans-serif; font-size:14px; font-weight:600; color:#FFFFFF; text-decoration:none;">
            Reset password →
          </a>
        </td>
      </tr>
    </table>

    <p style="margin:24px 0 0; font-family:Helvetica,Arial,sans-serif; font-size:13px; line-height:1.5; color:#6E7385;">
      Didn't request this? You can safely ignore this email — your password won't change.
    </p>
  `
});

const loginAlertEmail = ({ time, ip, device }) => emailShell({
  preheader: `New login to your PulseCoach account at ${time}.`,
  bodyHtml: `
    <h1 style="margin:0 0 12px; font-family:Helvetica,Arial,sans-serif; font-size:22px; font-weight:700; color:#10131A; letter-spacing:-0.02em;">
      New login detected
    </h1>
    <p style="margin:0 0 20px; font-family:Helvetica,Arial,sans-serif; font-size:15px; line-height:1.6; color:#3A3F4B;">
      Your PulseCoach account was just signed into.
    </p>

    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%; background-color:#F3F3F7; border-radius:10px; margin-bottom:20px;">
      <tr>
        <td style="padding:16px 20px; font-family:Helvetica,Arial,sans-serif; font-size:13px; color:#3A3F4B; line-height:1.9;">
          <strong>Time:</strong> ${time}<br>
          <strong>IP address:</strong> ${ip || "unknown"}<br>
          <strong>Device:</strong> ${device || "unknown"}
        </td>
      </tr>
    </table>

    <p style="margin:0; font-family:Helvetica,Arial,sans-serif; font-size:13px; line-height:1.5; color:#6E7385;">
      Wasn't you? Reset your password immediately using the "Forgot password?" link on the login screen.
    </p>
  `
});

module.exports = { sendEmail, welcomeEmail, resetPasswordEmail, loginAlertEmail };
