import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";
import type { VercelRequest, VercelResponse } from "@vercel/node";

type Section = "income" | "expense" | "saving" | "bank";
type SetupItem = { name: string; active: boolean };

const RANGES: Record<Section, { categoryCol: string; statusCol: string; start: number; end: number }> = {
  income: { categoryCol: "B", statusCol: "C", start: 1, end: 200 },
  expense: { categoryCol: "E", statusCol: "F", start: 1, end: 200 },
  saving: { categoryCol: "H", statusCol: "I", start: 1, end: 200 },
  bank: { categoryCol: "K", statusCol: "L", start: 1, end: 200 },
};

function getSheetsClient() {
  const raw = process.env.GOOGLE_CREDENTIALS;
  if (!raw) throw new Error("GOOGLE_CREDENTIALS belum diset");
  const credentials = JSON.parse(raw);
  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

function asBool(value: unknown) {
  if (typeof value === "boolean") return value;
  const v = String(value ?? "").trim().toLowerCase();
  return ["true", "yes", "1", "active", "aktif", "checked", "✓"].includes(v);
}

async function getUser(token: string) {
  const supabase = createClient(process.env.SUPABASE_URL as string, process.env.SUPABASE_ANON_KEY as string);
  const { data, error } = await supabase
    .from("users")
    .select("username, spreadsheet_id, is_active")
    .eq("dashboard_token", token)
    .single();
  if (error || !data) throw new Error("Link tidak valid");
  if (!data.is_active) throw new Error("Akun belum aktif");
  if (!data.spreadsheet_id) throw new Error("Spreadsheet belum tersedia");
  return data;
}

async function getSetupRange(sheets: ReturnType<typeof getSheetsClient>, spreadsheetId: string) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId, fields: "sheets.properties(sheetId,title)" });
  const setupSheet = (meta.data.sheets || []).find((sheet) =>
    String(sheet.properties?.title || "").trim().toLowerCase().replace(/\s+/g, "") === "setup"
  );
  if (!setupSheet?.properties?.title) throw new Error("Tab Setup tidak ditemukan di spreadsheet");
  const title = String(setupSheet.properties.title).replace(/'/g, "''");
  return `'${title}'!B1:L200`;
}

async function readSetup(sheets: ReturnType<typeof getSheetsClient>, spreadsheetId: string) {
  const setupRange = await getSetupRange(sheets, spreadsheetId);
  const result = await sheets.spreadsheets.values.get({ spreadsheetId, range: setupRange });
  const rows = result.data.values || [];
  const sections: Record<Section, SetupItem[]> = { income: [], expense: [], saving: [], bank: [] };

  for (const [section, cfg] of Object.entries(RANGES) as [Section, typeof RANGES[Section]][]) {
    const catOffset = cfg.categoryCol.charCodeAt(0) - "B".charCodeAt(0);
    const statusOffset = cfg.statusCol.charCodeAt(0) - "B".charCodeAt(0);
    let headerRow = 0;
    for (let r = 0; r < rows.length; r++) {
      if (String(rows[r]?.[catOffset] ?? "").trim().toLowerCase() === "category") {
        headerRow = r + 1;
        break;
      }
    }
    for (let r = headerRow; r < Math.min(rows.length, cfg.end); r++) {
      const name = String(rows[r]?.[catOffset] ?? "").trim();
      if (!name) continue;
      if (name.toLowerCase() === "total") break;
      sections[section].push({ name, active: asBool(rows[r]?.[statusOffset]) });
    }
  }

  return sections;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const token = String(req.body?.token || req.query.token || "").trim();
  if (!token) return res.status(400).json({ error: "Token tidak ditemukan" });

  try {
    const user = await getUser(token);
    const sheets = getSheetsClient();
    if (req.method === "GET") {
      const sections = await readSetup(sheets, user.spreadsheet_id);
      return res.status(200).json({
        username: user.username,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${user.spreadsheet_id}/edit`,
        sections,
      });
    }

    if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });
    const sections = req.body?.sections as Record<Section, SetupItem[]>;
    if (!sections || typeof sections !== "object") return res.status(400).json({ error: "Setup tidak lengkap" });

    // Preserve the Setup headers and checkbox formatting. We only clear/write
    // rows below each "Category / Status" header.
    const setupRange = await getSetupRange(sheets, user.spreadsheet_id);
    const existing = await sheets.spreadsheets.values.get({ spreadsheetId: user.spreadsheet_id, range: setupRange });
    const rows = existing.data.values || [];
    const data: { range: string; values: unknown[][] }[] = [];
    const clearRanges: string[] = [];

    for (const [section, cfg] of Object.entries(RANGES) as [Section, typeof RANGES[Section]][]) {
      const catOffset = cfg.categoryCol.charCodeAt(0) - "B".charCodeAt(0);
      let headerIndex = -1;
      for (let r = 0; r < rows.length; r++) {
        if (String(rows[r]?.[catOffset] ?? "").trim().toLowerCase() === "category") {
          headerIndex = r;
          break;
        }
      }
      if (headerIndex === -1) throw new Error(`Header ${section} tidak ditemukan di tab Setup`);

      const startRow = headerIndex + 2; // 1-indexed sheet row immediately below header
      const endRow = cfg.end;
      clearRanges.push(`${setupRange.split("!")[0]}!${cfg.categoryCol}${startRow}:${cfg.statusCol}${endRow}`);

      const items = Array.isArray(sections[section]) ? sections[section] : [];
      const safe = items
        .map((item) => ({ name: String(item?.name || "").trim(), active: Boolean(item?.active) }))
        .filter((item) => item.name)
        .slice(0, endRow - startRow + 1);
      if (safe.length) {
        data.push({
          range: `${setupRange.split("!")[0]}!${cfg.categoryCol}${startRow}:${cfg.statusCol}${startRow + safe.length - 1}`,
          values: safe.map((item) => [item.name, item.active]),
        });
      }
    }

    await sheets.spreadsheets.values.batchClear({
      spreadsheetId: user.spreadsheet_id,
      requestBody: { ranges: clearRanges },
    });
    if (data.length) {
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: user.spreadsheet_id,
        requestBody: {
          valueInputOption: "USER_ENTERED",
          data,
        },
      });
    }

    return res.status(200).json({ success: true, sections });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal memproses setup";
    const status = message.includes("Link tidak valid") ? 404 : message.includes("belum aktif") ? 403 : 500;
    console.error("setup error:", message);
    return res.status(status).json({ error: message });
  }
}
