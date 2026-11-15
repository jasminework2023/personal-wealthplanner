import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";
import type { VercelRequest, VercelResponse } from "@vercel/node";

type Target = {
  id: string;
  name: string;
  targetAmount: number;
  targetDate: string;
  currentValueSource: string;
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

function colLetter(col: number) {
  let n = col;
  let out = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

function parseAmount(value: unknown) {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const raw = String(value).replace(/Rp|IDR|\$/gi, "").replace(/\s/g, "").trim();
  if (!raw) return 0;
  const lastComma = raw.lastIndexOf(",");
  const lastDot = raw.lastIndexOf(".");
  let cleaned = raw;
  if (lastComma !== -1 && lastDot !== -1) {
    cleaned = lastComma > lastDot ? raw.replace(/\./g, "").replace(",", ".") : raw.replace(/,/g, "");
  } else if (lastComma !== -1) {
    cleaned = raw.length - lastComma - 1 === 3 ? raw.replace(/,/g, "") : raw.replace(",", ".");
  } else if (lastDot !== -1) {
    cleaned = raw.length - lastDot - 1 === 3 ? raw.replace(/\./g, "") : raw;
  }
  const n = Number(cleaned.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

async function getAssetTrackerSheet(token: string) {
  const supabase = createClient(
    process.env.SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  );
  const { data: user, error } = await supabase
    .from("users")
    .select("spreadsheet_id, is_active")
    .eq("dashboard_token", token)
    .single();

  if (error || !user || !user.is_active || !user.spreadsheet_id) {
    throw new Error("Akun tidak ditemukan");
  }

  const sheets = getSheetsClient();
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: user.spreadsheet_id,
    fields: "sheets.properties(sheetId,title)",
  });
  const sheet = (meta.data.sheets || []).find(
    (x) => String(x.properties?.title || "").trim().toLowerCase().replace(/\s+/g, "") === "assettracker",
  );
  if (!sheet?.properties?.title) throw new Error("Tab Asset Tracker tidak ditemukan");

  return { sheets, spreadsheetId: user.spreadsheet_id, title: String(sheet.properties.title).replace(/'/g, "''") };
}

async function readRows(sheets: any, spreadsheetId: string, title: string) {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${title}'!A1:O500`,
  });
  return response.data.values || [];
}

function findTargetSection(rows: unknown[][]) {
  for (let i = 0; i < rows.length; i++) {
    const label = String(rows[i]?.[0] ?? "").trim().toLowerCase();
    if (label === "target assets" || label === "target aset") {
      return { sectionRow: i };
    }
  }
  return null;
}

function findLegacyTarget(rows: unknown[][]) {
  const labels = ["target aset", "target asset", "target"];
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r] || [];
    for (let c = 0; c < row.length; c++) {
      if (!labels.includes(String(row[c] ?? "").trim().toLowerCase())) continue;
      const candidates = [
        { row: r, col: c + 1, value: row[c + 1] },
        { row: r, col: c + 2, value: row[c + 2] },
        { row: r + 1, col: c, value: (rows[r + 1] || [])[c] },
        { row: r + 1, col: c + 1, value: (rows[r + 1] || [])[c + 1] },
      ];
      const numeric = candidates.find((candidate) => /(?:\d|rp|idr|\$)/i.test(String(candidate.value ?? "")));
      if (numeric) {
        return {
          row: numeric.row,
          col: numeric.col,
          value: parseAmount(numeric.value),
        };
      }
    }
  }
  return null;
}

function readTargets(rows: unknown[][]): Target[] {
  const section = findTargetSection(rows);
  if (section) {
    const targets: Target[] = [];
    for (let r = section.sectionRow + 2; r < rows.length; r++) {
      const row = rows[r] || [];
      if (!String(row[0] ?? "").trim()) continue;
      if (String(row[0] ?? "").trim().toLowerCase() === "target assets") break;
      const id = String(row[0] ?? "").trim();
      const name = String(row[1] ?? "").trim();
      if (!id || !name) continue;
      const amount = parseAmount(row[2]);
      targets.push({
        id,
        name,
        targetAmount: amount,
        targetDate: String(row[3] ?? "").trim(),
        currentValueSource: String(row[4] ?? "Asset Tracker").trim() || "Asset Tracker",
      });
    }
    return targets;
  }

  const legacy = findLegacyTarget(rows);
  if (!legacy || legacy.value <= 0) return [];
  return [{
    id: "legacy-target",
    name: "Target Aset",
    targetAmount: legacy.value,
    targetDate: "",
    currentValueSource: "Asset Tracker",
  }];
}

async function ensureTargetSection(sheets: any, spreadsheetId: string, title: string, rows: unknown[][]) {
  const existing = findTargetSection(rows);
  if (existing) return existing.sectionRow;

  let lastUsedRow = rows.length;
  while (lastUsedRow > 0 && (rows[lastUsedRow - 1] || []).every((cell) => String(cell ?? "").trim() === "")) {
    lastUsedRow--;
  }
  const sectionRow = lastUsedRow + 2;
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${title}'!A${sectionRow}:E${sectionRow + 1}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        ["Target Assets"],
        ["ID", "Nama Target", "Nominal Target", "Tanggal Target", "Sumber Nilai Saat Ini"],
      ],
    },
  });
  return sectionRow - 1;
}

function validateTarget(body: any) {
  const name = String(body.name ?? "").trim();
  const targetAmount = Number(body.targetAmount);
  const targetDate = String(body.targetDate ?? "").trim();
  if (!name) throw new Error("Nama target wajib diisi.");
  if (!Number.isFinite(targetAmount) || targetAmount < 0) throw new Error("Nominal target wajib diisi dan tidak boleh negatif.");
  if (targetDate && !/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) throw new Error("Tanggal target tidak valid.");
  return { name, targetAmount, targetDate, currentValueSource: "Asset Tracker" };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const token = String(req.query.token || req.body?.token || "").trim();
  if (!token) return res.status(400).json({ error: "Token tidak ditemukan" });

  try {
    const { sheets, spreadsheetId, title } = await getAssetTrackerSheet(token);
    const rows = await readRows(sheets, spreadsheetId, title);

    if (req.method === "GET") {
      return res.status(200).json({ targets: readTargets(rows) });
    }

    const targets = readTargets(rows);

    if (req.method === "POST") {
      const data = validateTarget(req.body || {});
      const sectionRow = await ensureTargetSection(sheets, spreadsheetId, title, rows);
      const refreshed = await readRows(sheets, spreadsheetId, title);
      const section = findTargetSection(refreshed);
      const startRow = section ? section.sectionRow + 2 : sectionRow + 2;
      let rowNumber = startRow;
      while (rowNumber <= 500 && String(refreshed[rowNumber - 1]?.[0] ?? "").trim()) rowNumber++;
      if (rowNumber > 500) return res.status(409).json({ error: "Ruang Target Assets penuh." });

      const id = globalThis.crypto?.randomUUID?.() || `target-${Date.now()}`;
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `'${title}'!A${rowNumber}:E${rowNumber}`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [[id, data.name, data.targetAmount, data.targetDate, data.currentValueSource]] },
      });
      return res.status(201).json({ target: { id, ...data } });
    }

    if (req.method === "PUT") {
      const id = String(req.body?.targetId || "").trim();
      if (!id) return res.status(400).json({ error: "ID target tidak ditemukan." });
      const data = validateTarget(req.body || {});
      let section = findTargetSection(rows);
      if (!section && id === "legacy-target") {
        const legacy = findLegacyTarget(rows);
        if (!legacy) return res.status(404).json({ error: "Target tidak ditemukan." });
        await ensureTargetSection(sheets, spreadsheetId, title, rows);
        const refreshed = await readRows(sheets, spreadsheetId, title);
        section = findTargetSection(refreshed);
        if (!section) return res.status(500).json({ error: "Target Assets gagal dibuat." });
        const rowNumber = section.sectionRow + 2;
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `'${title}'!A${rowNumber}:E${rowNumber}`,
          valueInputOption: "USER_ENTERED",
          requestBody: { values: [[globalThis.crypto?.randomUUID?.() || `target-${Date.now()}`, data.name, data.targetAmount, data.targetDate, data.currentValueSource]] },
        });
        await sheets.spreadsheets.values.clear({ spreadsheetId, range: `'${title}'!${colLetter(legacy.col + 1)}${legacy.row + 1}` });
        return res.status(200).json({ target: { id: "migrated-target", ...data } });
      }

      if (!section) return res.status(404).json({ error: "Target Assets belum tersedia." });

      let rowNumber = -1;
      for (let r = section.sectionRow + 2; r < rows.length; r++) {
        if (String(rows[r]?.[0] ?? "").trim() === id) {
          rowNumber = r + 1;
          break;
        }
      }
      if (rowNumber < 0) return res.status(404).json({ error: "Target tidak ditemukan." });

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `'${title}'!A${rowNumber}:E${rowNumber}`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [[id, data.name, data.targetAmount, data.targetDate, data.currentValueSource]] },
      });
      return res.status(200).json({ target: { id, ...data } });
    }

    if (req.method === "DELETE") {
      const id = String(req.body?.targetId || "").trim();
      if (!id) return res.status(400).json({ error: "ID target tidak ditemukan." });
      const section = findTargetSection(rows);
      if (!section && id === "legacy-target") {
        const legacy = findLegacyTarget(rows);
        if (!legacy) return res.status(404).json({ error: "Target tidak ditemukan." });
        await sheets.spreadsheets.values.clear({
          spreadsheetId,
          range: `'${title}'!${colLetter(legacy.col + 1)}${legacy.row + 1}`,
        });
        return res.status(200).json({ success: true });
      }
      if (!section) return res.status(404).json({ error: "Target Assets belum tersedia." });

      let rowNumber = -1;
      for (let r = section.sectionRow + 2; r < rows.length; r++) {
        if (String(rows[r]?.[0] ?? "").trim() === id) {
          rowNumber = r + 1;
          break;
        }
      }
      if (rowNumber < 0) return res.status(404).json({ error: "Target tidak ditemukan." });

      await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: `'${title}'!A${rowNumber}:E${rowNumber}`,
      });
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: "Method Not Allowed" });
  } catch (err) {
    console.error("asset target error:", err);
    return res.status(500).json({ error: err instanceof Error ? err.message : "Gagal memproses target aset" });
  }
}
