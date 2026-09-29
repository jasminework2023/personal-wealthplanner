type ActivationEmailArgs = {
  to: string;
  name: string;
  product: string;
  dashboardUrl: string;
  telegramUrl?: string | null;
  templateUrl?: string | null;
  /** Optional Resend Idempotency-Key so a retried webhook can never send twice. */
  idempotencyKey?: string | null;
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
  telegramUrl,
  templateUrl,
  idempotencyKey,
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
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "🎉 Selamat datang di Wealthplanner!",
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.7;color:#173f35;max-width:620px;margin:auto;background:#fff">
          <h2 style="margin:0 0 18px">🎉 Selamat datang di Wealthplanner!</h2>
          <p>Halo ${escapeHtml(name)},</p>
          <p>
            Pembayaran untuk <strong>${escapeHtml(product)}</strong> sudah berhasil kami terima.
            Terima kasih sudah mempercayakan perjalanan perencanaan keuanganmu bersama Wealthplanner.
          </p>
          <p>
            Mulai sekarang, kamu sudah memiliki akses ke <strong>Personal Wealth Planner</strong>
            untuk membantu kamu mencatat, memantau, dan merencanakan keuangan dengan lebih terarah.
          </p>

          <div style="margin:26px 0 10px;padding:18px;border:1px solid #dce9e4;border-radius:14px;background:#f8fbfa">
            <p style="margin:0 0 10px;font-weight:700">📌 Klik tombol berikut untuk membuka dashboard dan memulai aktivasi:</p>
            <a href="${escapeHtml(dashboardUrl)}" style="display:inline-block;padding:12px 18px;background:#286650;color:#fff;text-decoration:none;border-radius:9px;font-weight:700">
              Buka Dashboard Saya
            </a>
            <p style="margin:10px 0 0;font-size:12px;color:#66736f;word-break:break-all">
              ${escapeHtml(dashboardUrl)}
            </p>
          </div>

          <div style="margin:18px 0 10px;padding:18px;border:1px solid #dce9e4;border-radius:14px">
            <p style="margin:0 0 8px;font-weight:700">1️⃣ Buat Google Sheet pribadi</p>
            <p style="margin:0 0 12px;font-size:13px;color:#66736f">Setelah membuka halaman aktivasi, ikuti langkah <strong>Make a copy</strong> lalu hubungkan Sheet tersebut ke Wealthplanner.</p>
            <a href="${escapeHtml(copyTemplateUrl)}" style="display:inline-block;padding:10px 15px;background:#edf6f2;color:#173f35;text-decoration:none;border:1px solid #c5ddd4;border-radius:8px;font-weight:700">
              Buka Template Google Sheet
            </a>
          </div>

          <div style="margin:18px 0 10px;padding:18px;border:1px solid #dce9e4;border-radius:14px;background:#fbfaf8">
            <p style="margin:0 0 8px;font-weight:700">2️⃣ Hubungkan Telegram (opsional)</p>
            <p style="margin:0 0 12px;font-size:13px;color:#66736f">
              Tidak perlu mencari atau mengetik ID Telegram. Cukup klik tombol di bawah. Link ini bersifat pribadi dan berlaku terbatas.
            </p>
            ${telegramUrl ? `<a href="${escapeHtml(telegramUrl)}" style="display:inline-block;padding:10px 15px;background:#286650;color:#fff;text-decoration:none;border-radius:8px;font-weight:700">Hubungkan Telegram</a>` : `<p style="margin:0;font-size:13px;color:#66736f">Hubungkan Telegram dapat dilakukan dari Dashboard setelah aktivasi.</p>`}
          </div>

          <p style="margin-top:24px">
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
