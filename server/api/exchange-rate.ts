import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method Not Allowed" });

  const from = String(req.query.from || "USD").toUpperCase();
  const to = String(req.query.to || "IDR").toUpperCase();

  if (!/^[A-Z]{3}$/.test(from) || !/^[A-Z]{3}$/.test(to)) {
    return res.status(400).json({ error: "Currency code tidak valid." });
  }

  try {
    const response = await fetch(`https://open.er-api.com/v6/latest/${encodeURIComponent(from)}`, {
      headers: { Accept: "application/json" },
    });
    const data = await response.json();

    const rate = Number(data?.rates?.[to]);
    if (!response.ok || !Number.isFinite(rate) || rate <= 0) {
      return res.status(502).json({ error: "Kurs tidak tersedia." });
    }

    return res.status(200).json({
      from,
      to,
      rate,
      updatedAt: data?.time_last_update_utc || new Date().toISOString(),
      source: "open.er-api.com",
    });
  } catch (error) {
    console.error("exchange-rate error:", error);
    return res.status(502).json({ error: "Gagal mengambil kurs." });
  }
}
