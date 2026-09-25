type ActivationEmailArgs = {
  to: string;
  name: string;
  product: string;
  dashboardUrl: string;
  spreadsheetUrl?: string | null;
};

export async function sendActivationEmail({
  to,
  name,
  product,
  dashboardUrl,
  spreadsheetUrl,
}: ActivationEmailArgs) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || "Wealthplanner <hello@wealthplanner.id>";

  if (!apiKey) throw new Error("RESEND_API_KEY belum diset");
  if (!to) throw new Error("Email customer kosong");

  const safeDashboardUrl = escapeHtml(dashboardUrl);
  const safeSpreadsheetUrl = spreadsheetUrl ? escapeHtml(spreadsheetUrl) : "";

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "Selamat datang di Wealthplanner 🎉",
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#173f35;max-width:620px;margin:auto">
          <h2>🎉 Selamat datang di Wealthplanner!</h2>
          <p>Halo ${escapeHtml(name)},</p>
          <p>
            Pembayaran untuk <strong>${escapeHtml(product)}</strong> sudah berhasil kami terima.
            Terima kasih sudah mempercayakan perjalanan perencanaan keuanganmu bersama Wealthplanner.
          </p>
          <p>
            Mulai sekarang, kamu sudah bisa mengakses <strong>dashboard keuangan pribadi</strong>
            dari Personal Wealth Planner untuk mulai mencatat, memantau, dan merencanakan keuanganmu.
          </p>

          <div style="margin-top:24px">
            <h3 style="margin-bottom:8px">💻 Personal Wealth Planner</h3>
            <p style="margin-top:0">
              <a href="${safeDashboardUrl}"
                 style="display:inline-block;padding:12px 18px;background:#173f35;color:#fff;text-decoration:none;border-radius:8px">
                Buka Dashboard Saya
              </a>
            </p>
            <p style="margin-top:4px;font-size:14px;color:#5f716b">
              Untuk mengakses web app Personal Wealth Planner dan mulai menggunakan fitur-fitur di dalamnya.
            </p>
          </div>

          ${safeSpreadsheetUrl ? `
          <div style="margin-top:24px">
            <h3 style="margin-bottom:8px">📊 Wealth Tracker</h3>
            <p style="margin-top:0">
              <a href="${safeSpreadsheetUrl}"
                 style="display:inline-block;padding:12px 18px;background:#e9f4ef;color:#173f35;text-decoration:none;border-radius:8px;border:1px solid #cfe5db">
                Buka Sheet Wealthplanner
              </a>
            </p>
            <p style="margin-top:4px;font-size:14px;color:#5f716b">
              Untuk mengakses Sheet Personal Wealth Planner sebagai bagian dari proses pencatatan dan tracking keuanganmu.
            </p>
          </div>` : ""}

          <p style="margin-top:24px">
            📌 <strong>Petunjuk penggunaan tersedia di masing-masing link di atas.</strong>
          </p>

          <p>
            Semoga Wealthplanner bisa menjadi temanmu untuk membuat keuangan lebih terarah,
            satu langkah demi satu langkah. 🌱
          </p>
          <p>Selamat memulai perjalanan finansialmu!</p>
          <p><strong>Wealthplanner.id</strong></p>
        </div>
      `,

    }),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(`Resend ${response.status}: ${JSON.stringify(result)}`);
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
