const RESEND_API_URL = "https://api.resend.com/emails";

export async function sendWelcomeEmail({
  to,
  name,
  dashboardToken,
}: {
  to: string;
  name: string;
  dashboardToken: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || "Wealthplanner <hello@wealthplanner.id>";

  if (!apiKey) throw new Error("RESEND_API_KEY belum diset");
  if (!to) throw new Error("Email customer kosong");

  const dashboardUrl = `https://wealthplanner.id/dashboard?token=${encodeURIComponent(dashboardToken)}`;

  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `wealthplanner-welcome-${dashboardToken}`,
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "Pembayaran berhasil — Akses Wealthplanner Personal kamu",
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#172018;max-width:640px;margin:auto">
          <h2>Pembayaran berhasil 🎉</h2>
          <p>Halo ${escapeHtml(name)},</p>
          <p>Pembayaran Wealthplanner Personal kamu sudah kami terima.</p>
          <p>Akses dashboard kamu:</p>
          <p>
            <a href="${dashboardUrl}" style="display:inline-block;padding:12px 18px;background:#123c2b;color:#fff;text-decoration:none;border-radius:8px">
              Buka Dashboard Wealthplanner
            </a>
          </p>
          <p>Setelah masuk, kamu bisa melanjutkan proses aktivasi dan menghubungkan spreadsheet ke akunmu.</p>
          <p>Terima kasih sudah menggunakan Wealthplanner. 💚</p>
        </div>
      `,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Resend ${response.status}: ${data?.message || data?.name || "Gagal mengirim email"}`);
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
