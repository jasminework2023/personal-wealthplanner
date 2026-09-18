import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method Not Allowed" });
  const ref = typeof req.query.ref === "string" ? req.query.ref : "";
  if (!ref) return res.status(400).json({ error: "Reference tidak ditemukan." });

  try {
    const supabase = createClient(process.env.SUPABASE_URL as string, process.env.SUPABASE_ANON_KEY as string);
    const { data: user, error } = await supabase
      .from("users")
      .select("username, dashboard_token, spreadsheet_id, is_active")
      .eq("dashboard_token", ref)
      .single();

    if (error || !user) return res.status(404).json({ error: "Customer tidak ditemukan." });
    if (!user.is_active || !user.spreadsheet_id) {
      return res.status(202).json({ ready: false, message: "Pembayaran sedang diproses." });
    }

    return res.status(200).json({
      ready: true,
      username: user.username,
      dashboardUrl: `https://wealthplanner.id/dashboard?token=${encodeURIComponent(user.dashboard_token)}`,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${user.spreadsheet_id}/edit`,
    });
  } catch (error) {
    console.error("access error:", error);
    return res.status(500).json({ error: "Gagal mengecek akses." });
  }
}
