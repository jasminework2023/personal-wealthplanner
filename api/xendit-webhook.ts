import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";
import type { VercelRequest, VercelResponse } from "@vercel/node";

function db() {
  return createClient(
    process.env.SUPABASE_URL as string,
    process.env.SUPABASE_ANON_KEY as string,
  );
}

function getGoogleAuth(scopes: string[]) {
  const raw = process.env.GOOGLE_CREDENTIALS;
  if (!raw) throw new Error("GOOGLE_CREDENTIALS belum diset");
  const credentials = JSON.parse(raw);
  return new google.auth.JWT({ email: credentials.client_email, key: credentials.private_key, scopes });
}

async function createCustomerSpreadsheet(name: string) {
  const templateId = process.env.GOOGLE_TEMPLATE_SPREADSHEET_ID;
  if (!templateId) throw new Error("GOOGLE_TEMPLATE_SPREADSHEET_ID belum diset");

  const drive = google.drive({ version: "v3", auth: getGoogleAuth(["https://www.googleapis.com/auth/drive"]) });
  const copy = await drive.files.copy({
    fileId: templateId,
    requestBody: {
      name: `Wealthplanner — ${name}`,
      ...(process.env.GOOGLE_DRIVE_FOLDER_ID ? { parents: [process.env.GOOGLE_DRIVE_FOLDER_ID] } : {}),
    },
    fields: "id,name,webViewLink",
  });

  if (!copy.data.id) throw new Error("Spreadsheet baru gagal dibuat");
  return { id: copy.data.id, url: copy.data.webViewLink || `https://docs.google.com/spreadsheets/d/${copy.data.id}/edit` };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const callbackToken = req.headers["x-callback-token"];
  const expected = process.env.XENDIT_WEBHOOK_TOKEN;
  if (!expected || callbackToken !== expected) {
    return res.status(401).json({ error: "Unauthorized webhook" });
  }

  const body = req.body || {};
  if (body.event !== "payment_session.completed") return res.status(200).json({ received: true });

  const data = body.data || {};
  const referenceId = String(data.reference_id || "");
  const amount = Number(data.amount || 0);

  if (!referenceId || amount !== 149000 || data.status !== "COMPLETED") {
    return res.status(400).json({ error: "Webhook pembayaran tidak valid." });
  }

  try {
    const supabase = db();
    const { data: user, error } = await supabase
      .from("users")
      .select("user_id, username, spreadsheet_id, is_active")
      .eq("dashboard_token", referenceId)
      .single();

    if (error || !user) return res.status(404).json({ error: "Customer tidak ditemukan." });

    // Idempotency: Xendit can retry webhook delivery. If already active and
    // provisioned, acknowledge without creating another spreadsheet.
    if (user.is_active && user.spreadsheet_id) {
      return res.status(200).json({ received: true, alreadyProvisioned: true });
    }

    const sheet = await createCustomerSpreadsheet(String(user.username || "Customer"));

    const { error: updateError } = await supabase
      .from("users")
      .update({ spreadsheet_id: sheet.id, is_active: true })
      .eq("dashboard_token", referenceId);

    if (updateError) throw new Error(updateError.message);

    return res.status(200).json({ received: true, provisioned: true });
  } catch (error) {
    console.error("xendit-webhook provisioning error:", error);
    return res.status(500).json({ error: "Provisioning customer gagal; webhook akan dicoba lagi." });
  }
}
