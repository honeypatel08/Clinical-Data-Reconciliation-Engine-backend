const RESEND_API_URL = "https://api.resend.com/emails";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function sendAccountStatusEmail({ email, providerName, status }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  const from = process.env.RESEND_FROM || "Clinical System <onboarding@resend.dev>";
  const replyTo = process.env.RESEND_REPLY_TO || "clinicalsystemadmin@gmail.com";
  const approved = status === "approved";
  const safeName = escapeHtml(providerName || "Provider");
  const subject = approved
    ? "Your Clinical System account was approved"
    : "Your Clinical System account request was declined";
  const message = approved
    ? "Your account has been approved. You can now sign in using the password you chose during registration."
    : "Your account registration request was declined. Reply to this email if you believe this was a mistake.";

  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      reply_to: replyTo,
      subject,
      html: `<p>Hello ${safeName},</p><p>${message}</p><p>Clinical System</p>`,
      text: `Hello ${providerName || "Provider"},\n\n${message}\n\nClinical System`,
    }),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.message || `Resend returned HTTP ${response.status}`);
  }

  return result;
}

module.exports = { sendAccountStatusEmail };
