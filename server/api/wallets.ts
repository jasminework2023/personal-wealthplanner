import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const norm = (v: unknown) => String(v ?? "").trim().replace(/\s+/g, " ").toLowerCase();
const display = (v: unknown) => String(v ?? "").trim().replace(/\s+/g, " ");
const money = (v: unknown): number => {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  let s = String(v ?? "").replace(/Rp|IDR|\s/gi, "");
  if (s.includes(",") && s.includes(".")) s = s.lastIndexOf(",") > s.lastIndexOf(".") ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  else if (s.includes(",")) s = s.replace(",", ".");
  const n = Number(s.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};
function sheetsClient() {
  const raw = process.env.GOOGLE_CREDENTIALS;
  if (!raw) throw new Error("GOOGLE_CREDENTIALS belum diset");
  const c = JSON.parse(raw);
  const auth = new google.auth.JWT({ email: c.client_email, key: c.private_key, scopes: ["https://www.googleapis.com/auth/spreadsheets"] });
  return google.sheets({ version: "v4", auth });
}
async function authUser(token: string) {
  const sb = createClient(process.env.SUPABASE_URL as string, process.env.SUPABASE_SERVICE_ROLE_KEY as string);
  const { data, error } = await sb.from("users").select("username,spreadsheet_id,is_active").eq("dashboard_token", token).single();
  if (error || !data) throw Object.assign(new Error("Link tidak valid"), { status: 404 });
  if (!data.is_active) throw Object.assign(new Error("Akun belum aktif"), { status: 403 });
  if (!data.spreadsheet_id) throw Object.assign(new Error("Spreadsheet belum tersedia"), { status: 404 });
  return { sb, user: data };
}
function walletType(name: string): "cash" | "bank" | "investment" | "other" {
  const n = norm(name);
  if (/cash|tunai|dompet/.test(n)) return "cash";
  if (/saham|stock|reksa|invest|obligasi|emas|crypto/.test(n)) return "investment";
  if (/bank|bca|bni|bri|mandiri|cimb|jago|btn|danamon|permata|bsi|ovo|gopay|dana|shopeepay|linkaja/.test(n)) return "bank";
  return "other";
}
const BRAND: Record<string,string> = { bca:"#1A5FD0",mandiri:"#003D79",bni:"#F15A22",bri:"#00529C",cimb:"#B02A3F",gopay:"#00AA13",ovo:"#4C3494",dana:"#118EEA",shopeepay:"#EE4D2D",jago:"#FFB800",linkaja:"#E82529",stockbit:"#24382E",cash:"#0B7A52",tunai:"#0B7A52" };
function colorFor(name: string) {
  const n = norm(name);
  for (const [key,color] of Object.entries(BRAND)) if (n.includes(key)) return color;
  let h=0; for (const c of n) h=(h*31+c.charCodeAt(0))|0;
  return `hsl(${Math.abs(h)%360} 48% 34%)`;
}
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const token = String(req.method === "GET" ? req.query.token || "" : req.body?.token || "").trim();
  if (!token) return res.status(400).json({ error: "Token tidak ditemukan" });
  try {
    const { sb, user } = await authUser(token);
    if (req.method === "PATCH" || req.method === "POST") {
      const { id, color_mode, color, opening_balance, sort_order } = req.body || {};
      if (!id) return res.status(400).json({ error: "Wallet ID wajib diisi" });
      if (color_mode !== undefined && !["auto","custom"].includes(color_mode)) return res.status(400).json({ error: "color_mode harus auto atau custom" });
      if (color !== undefined && color !== null && !/^#[0-9a-f]{6}$/i.test(String(color))) return res.status(400).json({ error: "Warna harus hex #RRGGBB" });
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (color_mode !== undefined) patch.color_mode = color_mode;
      if (color !== undefined) patch.color = color;
      if (opening_balance !== undefined) {
        const n = Number(opening_balance); if (!Number.isFinite(n)) return res.status(400).json({ error: "Saldo awal tidak valid" });
        patch.opening_balance = n;
      }
      if (sort_order !== undefined) {
        const n = Number(sort_order); if (!Number.isInteger(n)) return res.status(400).json({ error: "sort_order harus bilangan bulat" });
        patch.sort_order = n;
      }
      const { data, error } = await sb.from("wallets").update(patch).eq("id", id).eq("username", user.username).select("*").single();
      if (error || !data) return res.status(404).json({ error: "Wallet tidak ditemukan" });
      return res.status(200).json({ success: true, wallet: data });
    }
    if (req.method !== "GET") return res.status(405).json({ error: "Method Not Allowed" });

    const sheets = sheetsClient();
    const batch = await sheets.spreadsheets.values.batchGet({ spreadsheetId: user.spreadsheet_id, ranges: ["Setup!K:L", "Transaction!B10:I"] });
    const setupRows = batch.data.valueRanges?.[0]?.values || [];
    const txRows = batch.data.valueRanges?.[1]?.values || [];
    let header = -1;
    for (let i=0;i<setupRows.length;i++) if (norm(setupRows[i]?.[0]) === "category") { header=i; break; }
    if (header < 0) throw new Error("Header Category pada Setup!K:L tidak ditemukan");
    const active = new Map<string,string>();
    for (let i=header+1;i<setupRows.length;i++) {
      const name=display(setupRows[i]?.[0]); if (!name || norm(name)==="total") break;
      const status=norm(setupRows[i]?.[1]);
      if (["true","yes","1","active","aktif","checked","✓"].includes(status)) active.set(norm(name),name);
    }
    const { data: existing, error: listError } = await sb.from("wallets").select("*").eq("username",user.username);
    if (listError) throw new Error("Gagal membaca wallets: "+listError.message);
    for (const name of active.values()) {
      const key=norm(name);
      const found=(existing||[]).find((w:any)=>w.name_key===key);
      if (!found) {
        const { error }=await sb.from("wallets").insert({ username:user.username,name,name_key:key });
        if (error && !String(error.message).toLowerCase().includes("duplicate")) throw new Error("Gagal sinkronisasi wallet: "+error.message);
      } else if (found.archived_at) {
        await sb.from("wallets").update({ name,name_key:key,archived_at:null,updated_at:new Date().toISOString() }).eq("id",found.id).eq("username",user.username);
      }
    }
    const { data: wallets, error: walletError } = await sb.from("wallets").select("*").eq("username",user.username).is("archived_at",null).order("sort_order").order("created_at");
    if (walletError) throw new Error("Gagal membaca wallet aktif: "+walletError.message);
    const activeKeys=new Set(active.keys());
    const sums=new Map<string,{inflow:number;outflow:number;count:number}>();
    let unassignedCount=0,unassignedNet=0;
    for (const row of txRows) {
      const type=display(row?.[2]).toLowerCase(), amount=money(row?.[5]), from=norm(row?.[6]), to=norm(row?.[7]);
      if (!type || !Number.isFinite(amount)) continue;
      if (!from && !to) { unassignedCount++; if(type==="income")unassignedNet+=amount; else if(type==="expense")unassignedNet-=amount; continue; }
      const add=(key:string,field:"inflow"|"outflow")=>{ if(!key)return; const x=sums.get(key)||{inflow:0,outflow:0,count:0}; x[field]+=amount; x.count++; sums.set(key,x); };
      if(type==="income") add(from,"inflow");
      if(type==="expense") add(from,"outflow");
      if(type==="transfer"){add(from,"outflow");add(to,"inflow");}
      if(type==="saving"&&from&&to){add(from,"outflow");add(to,"inflow");}
    }
    const result=(wallets||[]).filter((w:any)=>activeKeys.has(w.name_key)).map((w:any)=>{
      const s=sums.get(w.name_key)||{inflow:0,outflow:0,count:0};
      const resolvedColor=w.color_mode==="custom"&&w.color?w.color:colorFor(w.name);
      return {id:w.id,name:w.name,type:walletType(w.name),colorMode:w.color_mode,color:w.color,resolvedColor,openingBalance:Number(w.opening_balance)||0,balance:(Number(w.opening_balance)||0)+s.inflow-s.outflow,txCount:s.count,sortOrder:w.sort_order};
    });
    return res.status(200).json({ wallets:result,unassigned:{count:unassignedCount,net:unassignedNet},totalBalance:result.reduce((n:number,w:any)=>n+w.balance,0) });
  } catch (err) {
    const e=err as Error & {status?:number}; const message=e.message||"Gagal memuat wallets";
    console.error("wallets API:",message);
    return res.status(e.status||500).json({error:message});
  }
}
