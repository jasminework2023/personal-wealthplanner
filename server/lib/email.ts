const RESEND_API_URL = "https://api.resend.com/emails";

export async function sendWelcomeEmail({
  to,
  name,
  dashboardToken,
  referenceId,
}: {
  to: string;
  name: string;
  dashboardToken: string;
  referenceId: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey) throw new Error("RESEND_API_KEY belum diset");
  if (!from) throw new Error("RESEND_FROM_EMAIL belum diset");

  const dashboardUrl = `https://wealthplanner.id/dashboard/welcome?ref=${encodeURIComponent(dashboardToken)}`;
  const safeName = name || "kamu";

  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `welcome-email/${referenceId}`,
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "🎉 Pembayaran berhasil — Personal Wealth Planner",
      html: `<!doctype html>
<html lang="id">
  <body style="margin:0;background:#f6f8f7;font-family:Arial,sans-serif;color:#17211b;line-height:1.6;">
    <div style="max-width:620px;margin:0 auto;padding:32px 18px;">
      <div style="background:#ffffff;border-radius:20px;padding:32px;box-shadow:0 8px 30px rgba(20,40,30,.08);">
        <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#147a4b;">WEALTHPLANNER.ID</p>
        <h1 style="margin:0 0 16px;font-size:28px;line-height:1.25;">Pembayaran berhasil 🎉</h1>
        <p>Hi ${escapeHtml(safeName)},</p>
        <p>Pembayaran <strong>Personal Wealth Planner</strong> kamu sudah berhasil diterima dan akunmu sudah aktif.</p>
        <p>Sekarang kamu bisa masuk ke dashboard dan melanjutkan proses setup.</p>
        <p style="margin:28px 0;">
          <a href="${dashboardUrl}" style="display:inline-block;background:#147a4b;color:#ffffff;text-decoration:none;font-weight:700;padding:13px 22px;border-radius:10px;">Buka Dashboard →</a>
        </p>
        <p style="font-size:14px;color:#66736b;">Jika tombol di atas tidak bisa dibuka, gunakan link ini:<br>${dashboardUrl}</p>
        <hr style="border:0;border-top:1px solid #e7ece9;margin:28px 0;">
        <p style="font-size:13px;color:#7a857e;margin:0;">Reference: ${escapeHtml(referenceId)}</p>
        <p style="font-size:13px;color:#7a857e;margin:8px 0 0;">Jika kamu tidak merasa melakukan pembayaran ini, silakan hubungi kami.</p>
      </div>
    </div>
  </body>
</html>`,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Resend gagal: ${data?.message || response.statusText}`);
  }

  return data;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
