import crypto from "node:crypto";

type ActivationEmailArgs = {
  to: string;
  name: string;
  product: string;
  dashboardUrl: string;
  /** Deprecated: no longer shown in the email (kept so existing callers compile). */
  telegramUrl?: string | null;
  /** Deprecated: no longer shown in the email (kept so existing callers compile). */
  templateUrl?: string | null;
  /** Optional Resend Idempotency-Key so a retried webhook can never send twice. */
  idempotencyKey?: string | null;
};

export async function sendActivationEmail({
  to,
  name,
  product,
  dashboardUrl,
  idempotencyKey,
}: ActivationEmailArgs) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || "Wealthplanner <hello@wealthplanner.id>";

  if (!apiKey) throw new Error("RESEND_API_KEY belum diset");
  if (!to) throw new Error("Email customer kosong");

  const html = `
        <div style="font-family:Arial,sans-serif;line-height:1.7;color:#173f35;max-width:620px;margin:auto;padding:0 16px;background:#fff">
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
              Mulai Aktivasi
            </a>
            <p style="margin:10px 0 0;font-size:12px;color:#66736f;word-break:break-all">
              ${escapeHtml(dashboardUrl)}
            </p>
          </div>

          <p style="margin-top:24px">
            Semoga Wealthplanner bisa menjadi temanmu untuk membuat keuangan lebih terarah, satu langkah demi satu langkah. 🌱
          </p>
          <p>
            Jika ada kendala silakan menghubungi
            <a href="mailto:wealthplanner234@gmail.com" style="color:#286650;font-weight:700">wealthplanner234@gmail.com</a>
          </p>
          <p>Selamat memulai perjalanan finansialmu!</p>
          <p><strong>Wealthplanner.id</strong></p>
        </div>
      `;

  // Resend rejects (409) a reused Idempotency-Key whose payload differs. Tying the
  // key to a fingerprint of the content means: an identical retry of the same
  // payment is still de-duplicated, while a changed template / name is not blocked.
  const contentHash = crypto.createHash("sha256").update(html).digest("hex").slice(0, 12);
  const resendKey = idempotencyKey ? `${idempotencyKey}-${contentHash}` : null;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(resendKey ? { "Idempotency-Key": resendKey } : {}),
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "🎉 Selamat datang di Wealthplanner!",
      html,
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
