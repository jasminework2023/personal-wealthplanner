import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";
import type { VercelRequest, VercelResponse } from "@vercel/node";

function sheetsClient() {
  const c = JSON.parse(process.env.GOOGLE_CREDENTIALS as string);
  const auth = new google.auth.JWT({ email: c.client_email, key: c.private_key, scopes: ["https://www.googleapis.com/auth/spreadsheets"] });
  return google.sheets({ version: "v4", auth });
}
const norm = (v: unknown) => String(v ?? "").trim().replace(/\s+/g, " ").toLowerCase();
const display = (v: unknown) => String(v ?? "").trim().replace(/\s+/g, " ");
const TYPE_MAP: Record<string, string> = { income:"Income", expense:"Expense", saving:"Saving", transfer:"Transfer" };

async function activeWallets(sheets: ReturnType<typeof sheetsClient>, spreadsheetId: string) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId, fields: "sheets.properties(sheetId,title)" });
  const setup = (meta.data.sheets || []).find(s => norm(s.properties?.title).replace(/\s/g,"") === "setup");
  if (!setup?.properties?.title) throw new Error("Tab Setup tidak ditemukan");
  const title = String(setup.properties.title).replace(/'/g,"''");
  const r = await sheets.spreadsheets.values.get({ spreadsheetId, range: `'${title}'!K1:L200` });
  const rows = r.data.values || [];
  let header = rows.findIndex(row => norm(row?.[0]) === "category");
  if (header < 0) throw new Error("Header bank Category tidak ditemukan pada Setup kolom K:L");
  const map = new Map<string,string>();
  for (const row of rows.slice(header+1)) {
    const name=display(row?.[0]); if(!name) continue; if(norm(name)==="total") break;
    if(["true","yes","1","active","aktif","checked","✓"].includes(norm(row?.[1]))) map.set(norm(name),name);
  }
  return map;
}
async function validateWalletFields(sheets: ReturnType<typeof sheetsClient>, spreadsheetId: string, tx: any, type: string) {
  const wallet = display(tx.wallet), toWallet = display(tx.toWallet);
  if (wallet && toWallet && norm(wallet) === norm(toWallet)) throw new Error("Wallet asal dan tujuan harus berbeda");
  if (type === "Transfer" && (!wallet || !toWallet)) throw new Error("Transfer wajib memiliki Wallet asal dan To Wallet tujuan");
  if (type === "Saving" && toWallet && !wallet) throw new Error("Saving dengan To Wallet wajib memiliki Wallet asal");
  if ((type === "Income" || type === "Expense") && toWallet) throw new Error("To Wallet hanya boleh diisi untuk Transfer atau Saving");
  const active = await activeWallets(sheets, spreadsheetId);
  for (const name of [wallet,toWallet].filter(Boolean)) if (!active.has(norm(name))) throw new Error(`Wallet "${name}" tidak ditemukan atau tidak aktif pada Setup`);
  return { wallet, toWallet };
}
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });
  const { token, transaction } = req.body || {};
  if (!token || !transaction) return res.status(400).json({ error: "Data transaksi tidak lengkap" });
  const type = TYPE_MAP[String(transaction.type || "").trim().toLowerCase()];
  const amount = Number(transaction.amount);
  const date = String(transaction.date || "").trim();
  const month = String(transaction.month || "").trim();
  let category = String(transaction.category || "").trim();
  let description = String(transaction.description || "").trim();
  if (type === "Transfer") category = "Transfer";
  if (type === "Transfer" && !description) description = `Transfer ${display(transaction.wallet)} → ${display(transaction.toWallet)}`;
  if (!type || !date || !month || (!category && type !== "Transfer") || !description || !Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ error: "Data transaksi tidak valid" });
  }
  try {
    const sb = createClient(process.env.SUPABASE_URL as string, process.env.SUPABASE_SERVICE_ROLE_KEY as string);
    const { data: user, error } = await sb.from("users").select("spreadsheet_id,is_active").eq("dashboard_token", token).single();
    if (error || !user || !user.is_active || !user.spreadsheet_id) return res.status(404).json({ error: "Akun tidak ditemukan atau belum aktif" });
    const sheets=sheetsClient();
    let wallets: {wallet:string;toWallet:string};
    try { wallets=await validateWalletFields(sheets,user.spreadsheet_id,transaction,type); }
    catch(e) { return res.status(400).json({error:(e as Error).message}); }
    await sheets.spreadsheets.values.append({ spreadsheetId:user.spreadsheet_id, range:"Transaction!B10:I", valueInputOption:"USER_ENTERED", insertDataOption:"INSERT_ROWS", requestBody:{values:[[date,month,type,category,description,amount,wallets.wallet,wallets.toWallet]]}});
    return res.status(200).json({success:true,transaction:{date,month,type,category,description,amount,...wallets}});
  } catch(err) { console.error("add-transaction error:",(err as Error).message); return res.status(500).json({error:"Gagal menyimpan transaksi"}); }
}