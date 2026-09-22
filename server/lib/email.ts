type ActivationEmailArgs = {
  to: string;
  name: string;
  product: string;
  dashboardUrl: string;
};

export async function sendActivationEmail({
  to,
  name,
  product,
  dashboardUrl,
}: ActivationEmailArgs) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || "Wealthplanner <hello@wealthplanner.id>";

  if (!apiKey) throw new Error("RESEND_API_KEY belum diset");
  if (!to) throw new Error("Email customer kosong");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "Pembayaran berhasil — akses Wealthplanner kamu sudah aktif",
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#173f35;max-width:620px;margin:auto">
          <h2>Pembayaran berhasil 🎉</h2>
          <p>Halo ${escapeHtml(name)},</p>
          <p>
            Pembayaran untuk <strong>${escapeHtml(product)}</strong> sudah kami terima.
            Akses dashboard kamu sudah diaktifkan.
          </p>
          <p>
            <a href="${dashboardUrl}"
               style="display:inline-block;padding:12px 18px;background:#173f35;color:#fff;text-decoration:none;border-radius:8px">
              Buka Dashboard
            </a>
          </p>
          <p>Kalau ini pertama kali kamu masuk, ikuti langkah onboarding di dashboard.</p>
          <p>Terima kasih,<br>Wealthplanner.id</p>
        </div>
      `,
    }),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      `Resend ${response.status}: ${JSON.stringify(result)}`,
    );
  }

  return result;
}

function escapeHtml(value: string) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export default sendActivationEmail;
