type ActivationEmailArgs = {
  to: string;
  name: string;
  product: string;
  dashboardUrl: string;
  templateUrl?: string | null;
};

const DEFAULT_TEMPLATE_URL = "https://docs.google.com/spreadsheets/d/1N-IJSv76LwaBv-RNmf-fPtI5oCBsa2cM0VYZWAI1apo/copy";

function getCopyTemplateUrl(templateUrl?: string | null) {
  const raw = String(templateUrl || process.env.GOOGLE_TEMPLATE_URL || DEFAULT_TEMPLATE_URL).trim();
  const match = raw.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) return raw;
  return `https://docs.google.com/spreadsheets/d/${match[1]}/copy`;
}

export async function sendActivationEmail({
  to,
  name,
  product,
  dashboardUrl,
  templateUrl,
}: ActivationEmailArgs) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || "Wealthplanner <hello@wealthplanner.id>";

  if (!apiKey) throw new Error("RESEND_API_KEY belum diset");
  if (!to) throw new Error("Email customer kosong");

  const copyTemplateUrl = getCopyTemplateUrl(templateUrl);

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
        <div style="font-family:Arial,sans-serif;line-height:1.65;color:#173f35;max-width:620px;margin:auto">
          <h2 style="margin-bottom:18px">🎉 Selamat datang di Wealthplanner!</h2>
          <p>Halo ${escapeHtml(name)},</p>
          <p>
            Pembayaran untuk <strong>${escapeHtml(product)}</strong> sudah berhasil kami terima.
            Terima kasih sudah mempercayakan perjalanan perencanaan keuanganmu bersama Wealthplanner.
          </p>
          <p>
            Mulai sekarang, kamu sudah memiliki akses ke <strong>Personal Wealth Planner</strong>
            untuk membantu kamu mencatat, memantau, dan merencanakan keuangan dengan lebih terarah.
          </p>

          <div style="margin:28px 0 10px">
            <h3 style="margin:0 0 8px;color:#173f35">💻 Personal Wealth Planner</h3>
            <a href="${escapeHtml(dashboardUrl)}"
               style="display:inline-block;padding:12px 18px;background:#173f35;color:#fff;text-decoration:none;border-radius:8px;font-weight:700">
              Buka Dashboard Saya
            </a>
            <p style="margin:8px 0 0;font-size:13px;color:#66736f">Untuk mengakses web app Personal Wealth Planner.</p>
          </div>

          <div style="margin:24px 0 10px">
            <h3 style="margin:0 0 8px;color:#173f35">📊 Wealth Tracker</h3>
            <a href="${escapeHtml(copyTemplateUrl)}"
               style="display:inline-block;padding:12px 18px;background:#fff;color:#173f35;text-decoration:none;border:1px solid #b9d0c8;border-radius:8px;font-weight:700">
              Buat Wealth Tracker Saya
            </a>
            <p style="margin:8px 0 0;font-size:13px;color:#66736f">Untuk membuat salinan Wealth Tracker pribadi di Google Drive kamu.</p>
          </div>

          <p style="margin-top:22px;font-size:13px;color:#66736f">
            📌 Petunjuk penggunaan tersedia di masing-masing link di atas. Setelah membuat salinan Wealth Tracker,
            buka dashboard dan hubungkan Sheet tersebut agar dapat digunakan bersama Personal Wealth Planner.
          </p>

          <p style="margin-top:28px">
            Semoga Wealthplanner bisa menjadi temanmu untuk membuat keuangan lebih terarah, satu langkah demi satu langkah. 🌱
          </p>
          <p>Selamat memulai perjalanan finansialmu!</p>
          <p><strong>Wealthplanner.id</strong></p>
        </div>
      `,
    }),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Resend ${response.status}: ${JSON.stringify(result)}`);
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
