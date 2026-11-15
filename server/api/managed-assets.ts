import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";
import type { VercelRequest, VercelResponse } from "@vercel/node";

type Kind = "investment" | "real";
type Investment = {
  id: string; name: string; category: string; quantity: number; unit: string;
  buyPrice: number; currentPrice: number; sourceAccount: string; purchaseDate: string;
  note: string; transactionId: string; currency: "IDR" | "USD"; fxRate: number; costBasis: number;
};
type RealAsset = {
  id: string; name: string; initialValue: number; acquisitionDate: string;
  annualChangePercent: number; note: string; currentValue: number;
  sourceAccount: string; transactionId: string; fundingMode: "purchase" | "owned";
};

const norm = (v: unknown) => String(v ?? "").trim().replace(/\s+/g, " ").toLowerCase();
const display = (v: unknown) => String(v ?? "").trim().replace(/\s+/g, " ");
const num = (v: unknown) => {
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};
function isoDate(v: unknown) {
  const raw = String(v ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const m = raw.match(/^(\d{1,2})[\\/.-](\d{1,2})[\\/.-](\d{4})$/);
  return m ? `${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}` : "";
}
function yearsHeld(date: string) {
  const start = new Date(date + "T00:00:00Z").getTime();
  if (!Number.isFinite(start)) return 0;
  return Math.max(0, (Date.now() - start) / (365.2425 * 86400000));
}
function realValue(initialValue: number, annualChangePercent: number, acquisitionDate: string) {
  return initialValue * Math.pow(1 + annualChangePercent / 100, yearsHeld(acquisitionDate));
}
function sheetsClient() {
  const c = JSON.parse(process.env.GOOGLE_CREDENTIALS as string);
  const auth = new google.auth.JWT({ email: c.client_email, key: c.private_key, scopes: ["https://www.googleapis.com/auth/spreadsheets"] });
  return google.sheets({ version: "v4", auth });
}
async function auth(token: string) {
  const sb = createClient(process.env.SUPABASE_URL as string, process.env.SUPABASE_SERVICE_ROLE_KEY as string);
  const { data: user, error } = await sb.from("users").select("spreadsheet_id,is_active").eq("dashboard_token", token).single();
  if (error || !user || !user.is_active || !user.spreadsheet_id) throw Object.assign(new Error("Akun tidak ditemukan atau belum aktif"), { status: 404 });
  return user;
}
async function rows(sheets: any, spreadsheetId: string) {
  const r = await sheets.spreadsheets.values.get({ spreadsheetId, range: "Asset Tracker!A1:O2000" });
  return r.data.values || [];
}
function section(rows: any[][], label: string) {
  return rows.findIndex(r => norm(r?.[0]) === norm(label));
}
async function ensureSection(sheets: any, spreadsheetId: string, rows: any[][], label: string, headers: string[]) {
  const found = section(rows, label);
  if (found >= 0) return found;
  let last = rows.length;
  while (last > 0 && (rows[last-1] || []).every((x:any) => !display(x))) last--;
  const row = last + 2;
  await sheets.spreadsheets.values.update({
    spreadsheetId, range: `'Asset Tracker'!A${row}:${String.fromCharCode(64 + headers.length)}${row + 1}`,
    valueInputOption: "USER_ENTERED", requestBody: { values: [[label], headers] }
  });
  return row - 1;
}
function findId(rows: any[][], sectionRow: number, id: string) {
  if (sectionRow < 0) return -1;
  for (let i = sectionRow + 2; i < rows.length; i++) {
    if (display(rows[i]?.[0]) === id) return i + 1;
  }
  return -1;
}
function parseInvestment(rows: any[][]) {
  const s = section(rows, "Managed Investment Assets");
  if (s < 0) return [] as Investment[];
  const out: Investment[] = [];
  for (let i=s+2;i<rows.length;i++) {
    const r=rows[i]||[]; if (!display(r[0])) continue;
    if (["real assets","target assets"].includes(norm(r[0]))) break;
    const currency = norm(r[11]) === "usd" ? "USD" : "IDR";
    out.push({
      id:display(r[0]), name:display(r[1]), category:display(r[2]) || "Lainnya",
      quantity:num(r[3]), unit:display(r[4]) || "unit", buyPrice:num(r[5]), currentPrice:num(r[6]),
      sourceAccount:display(r[7]), purchaseDate:isoDate(r[8]), note:display(r[9]), transactionId:display(r[10]),
      currency, fxRate:num(r[12]) || 1, costBasis:num(r[13])
    });
  }
  return out;
}
function parseReal(rows: any[][]) {
  const s = section(rows, "Real Assets");
  if (s < 0) return [] as RealAsset[];
  const out: RealAsset[] = [];
  for (let i=s+2;i<rows.length;i++) {
    const r=rows[i]||[]; if (!display(r[0])) continue;
    if (norm(r[0]) === "target assets") break;
    const initial=num(r[2]), rate=num(r[4]), date=isoDate(r[3]);
    out.push({
      id:display(r[0]), name:display(r[1]), initialValue:initial, acquisitionDate:date,
      annualChangePercent:rate, note:display(r[5]), currentValue:realValue(initial,rate,date),
      sourceAccount:display(r[6]), transactionId:display(r[7]),
      fundingMode:norm(r[8]) === "purchase" ? "purchase" : "owned",
    });
  }
  return out;
}
function transactionDate() {
  const d=new Date();
  return { date:d.toISOString().slice(0,10), month:d.toLocaleString("en-US",{month:"long"}), year:d.getFullYear() };
}
async function transactionRows(sheets:any, spreadsheetId:string) {
  const r=await sheets.spreadsheets.values.get({spreadsheetId,range:"Transaction!B10:I"});
  return r.data.values || [];
}
async function appendTransaction(sheets:any, spreadsheetId:string, txid:string, amount:number, account:string, name:string, date:string) {
  const d=transactionDate();
  const useDate=date || d.date;
  const month=new Date(useDate+"T00:00:00").toLocaleString("en-US",{month:"long"});
  await sheets.spreadsheets.values.append({
    spreadsheetId, range:"Transaction!B10:I", valueInputOption:"USER_ENTERED", insertDataOption:"INSERT_ROWS",
    requestBody:{values:[[useDate,month,"Saving","Real Asset Purchase",`[real-asset:${txid}] ${name}`,amount,account,""]]}
  });
}
async function updatePurchaseTransaction(sheets:any, spreadsheetId:string, txid:string, amount:number, account:string) {
  const data=await transactionRows(sheets,spreadsheetId);
  for(let i=0;i<data.length;i++) {
    if(String(data[i]?.[4]||"").includes(`[real-asset:${txid}]`)) {
      await sheets.spreadsheets.values.update({spreadsheetId,range:`Transaction!G${i+10}:H${i+10}`,valueInputOption:"USER_ENTERED",requestBody:{values:[[amount,account]]}});
      return true;
    }
  }
  return false;
}
async function clearTransactionByMarker(sheets:any, spreadsheetId:string, marker:string) {
  const data=await transactionRows(sheets,spreadsheetId);
  for(let i=0;i<data.length;i++) if(String(data[i]?.[4]||"").includes(marker)) {
    await sheets.spreadsheets.values.clear({spreadsheetId,range:`Transaction!B${i+10}:I${i+10}`}); return true;
  }
  return false;
}
async function appendSaleTransaction(sheets:any, spreadsheetId:string, assetId:string, assetName:string, amount:number, destination:string, gainLoss:number) {
  const d=transactionDate();
  const suffix=gainLoss>=0 ? `Untung ${Math.round(gainLoss)}` : `Rugi ${Math.round(Math.abs(gainLoss))}`;
  await sheets.spreadsheets.values.append({
    spreadsheetId,range:"Transaction!B10:I",valueInputOption:"USER_ENTERED",insertDataOption:"INSERT_ROWS",
    requestBody:{values:[[d.date,d.month,"Income","Asset Sale",`[real-asset-sale:${assetId}] ${assetName} · ${suffix}`,amount,"",destination]]}
  });
}
async function appendOrReusePurchaseTransaction(sheets:any, spreadsheetId:string, txid:string, amount:number, account:string, name:string, purchaseDate:string) {
  const data=await transactionRows(sheets,spreadsheetId);
  const marker=`[real-asset:${txid}]`;
  if(data.some((r:any[])=>String(r?.[4]||"").includes(marker))) return;
  const duplicate=data.find((r:any[]) =>
    norm(r?.[2])==="saving" && norm(r?.[3])==="real asset purchase" &&
    norm(r?.[4]).includes(norm(name)) && Math.abs(num(r?.[5])-amount)<1 &&
    norm(r?.[6])===norm(account) && String(r?.[0]||"").slice(0,10)===purchaseDate
  );
  if(duplicate) return;
  await appendTransaction(sheets,spreadsheetId,txid,amount,account,name,purchaseDate);
}
export default async function handler(req:VercelRequest,res:VercelResponse) {
  const token=String(req.method==="GET"?req.query.token||"":req.body?.token||"").trim();
  if(!token) return res.status(400).json({error:"Token tidak ditemukan"});
  try {
    const user=await auth(token), sheets=sheetsClient(), data=await rows(sheets,user.spreadsheet_id);
    if(req.method==="GET") return res.status(200).json({investments:parseInvestment(data),realAssets:parseReal(data)});
    const kind:Kind=req.body?.kind==="real"?"real":"investment";
    const action=String(req.body?.action||"").toLowerCase();

    if(kind==="real") {
      const id=display(req.body?.id)||globalThis.crypto?.randomUUID?.()||("asset-"+Date.now());
      const existing=parseReal(data).find(x=>x.id===id);

      if(action==="delete") {
        if(!existing) return res.status(404).json({error:"Aset riil tidak ditemukan"});
        if(existing.fundingMode==="purchase" && existing.transactionId) await clearTransactionByMarker(sheets,user.spreadsheet_id,`[real-asset:${existing.transactionId}]`);
        const s=section(data,"Real Assets"), row=findId(data,s,id);
        if(row>0) await sheets.spreadsheets.values.clear({spreadsheetId:user.spreadsheet_id,range:`'Asset Tracker'!A${row}:I${row}`});
        return res.status(200).json({success:true});
      }

      if(action==="sell") {
        if(!existing) return res.status(404).json({error:"Aset riil tidak ditemukan"});
        const salePrice=num(req.body?.salePrice), destination=display(req.body?.destinationAccount);
        if(salePrice<=0 || !destination) return res.status(400).json({error:"Harga jual dan rekening tujuan wajib diisi."});
        const gainLoss=salePrice-existing.currentValue;
        await appendSaleTransaction(sheets,user.spreadsheet_id,id,existing.name,salePrice,destination,gainLoss);
        if(existing.fundingMode==="purchase" && existing.transactionId) await clearTransactionByMarker(sheets,user.spreadsheet_id,`[real-asset:${existing.transactionId}]`);
        const s=section(data,"Real Assets"), row=findId(data,s,id);
        if(row>0) await sheets.spreadsheets.values.clear({spreadsheetId:user.spreadsheet_id,range:`'Asset Tracker'!A${row}:I${row}`});
        return res.status(200).json({success:true,salePrice,gainLoss});
      }

      const name=display(req.body?.name), initial=num(req.body?.initialValue), date=isoDate(req.body?.acquisitionDate);
      const rate=num(req.body?.annualChangePercent), note=display(req.body?.note), sourceAccount=display(req.body?.sourceAccount);
      const fundingMode=norm(req.body?.fundingMode)==="purchase"?"purchase":"owned";
      if(!name || initial<0 || !date || rate<=-100) return res.status(400).json({error:"Nama, harga perolehan, tanggal perolehan, dan perubahan nilai wajib valid."});
      if(!existing && fundingMode==="purchase" && !sourceAccount) return res.status(400).json({error:"Rekening sumber dana wajib dipilih untuk pembelian aset riil."});
      if(existing?.fundingMode==="purchase" && !sourceAccount) return res.status(400).json({error:"Aset ini terhubung ke rekening sumber. Pilih rekening sumber dana."});

      const txid=existing?.transactionId || (fundingMode==="purchase" ? (globalThis.crypto?.randomUUID?.()||("tx-"+Date.now())) : "");
      if(fundingMode==="purchase") {
        if(existing?.transactionId) await updatePurchaseTransaction(sheets,user.spreadsheet_id,existing.transactionId,initial,sourceAccount);
        else await appendOrReusePurchaseTransaction(sheets,user.spreadsheet_id,txid,initial,sourceAccount,name,date);
      } else if(existing?.transactionId) {
        await clearTransactionByMarker(sheets,user.spreadsheet_id,`[real-asset:${existing.transactionId}]`);
      }

      const s=await ensureSection(sheets,user.spreadsheet_id,data,"Real Assets",["ID","Nama Aset","Harga Perolehan","Tanggal Perolehan","Perubahan/Tahun (%)","Catatan","Rekening Sumber","Transaction ID","Sumber"]);
      const refreshed=await rows(sheets,user.spreadsheet_id), row=findId(refreshed,s,id);
      const values=[[id,name,initial,date,rate,note,sourceAccount,txid,fundingMode]];
      if(row<0) {
        const fresh=await rows(sheets,user.spreadsheet_id), sectionRow=section(fresh,"Real Assets");
        let targetRow=sectionRow+2; while(display(fresh[targetRow]?.[0])) targetRow++;
        await sheets.spreadsheets.values.update({spreadsheetId:user.spreadsheet_id,range:`'Asset Tracker'!A${targetRow+1}:I${targetRow+1}`,valueInputOption:"USER_ENTERED",requestBody:{values}});
      } else await sheets.spreadsheets.values.update({spreadsheetId:user.spreadsheet_id,range:`'Asset Tracker'!A${row}:I${row}`,valueInputOption:"USER_ENTERED",requestBody:{values}});
      return res.status(200).json({success:true,asset:{id,name,initialValue:initial,acquisitionDate:date,annualChangePercent:rate,note,currentValue:realValue(initial,rate,date),sourceAccount,transactionId:txid,fundingMode}});
    }

    const id=display(req.body?.id)||globalThis.crypto?.randomUUID?.();
    if(action==="delete") {
      const s=section(data,"Managed Investment Assets"), row=findId(data,s,id);
      if(row<0) return res.status(404).json({error:"Aset investasi tidak ditemukan"});
      const existing=parseInvestment(data).find(x=>x.id===id);
      if(existing?.transactionId) await clearTransactionByMarker(sheets,user.spreadsheet_id,`[asset-tx:${existing.transactionId}]`);
      await sheets.spreadsheets.values.clear({spreadsheetId:user.spreadsheet_id,range:`'Asset Tracker'!A${row}:N${row}`});
      return res.status(200).json({success:true});
    }
    const name=display(req.body?.name), category=display(req.body?.category)||"Lainnya", quantity=num(req.body?.quantity), unit=display(req.body?.unit)||"unit", buyPrice=num(req.body?.buyPrice), currentPrice=num(req.body?.currentPrice), sourceAccount=display(req.body?.sourceAccount), purchaseDate=isoDate(req.body?.purchaseDate), note=display(req.body?.note), currency=String(req.body?.currency||"IDR")==="USD"?"USD":"IDR", fxRate=num(req.body?.fxRate)||1;
    if(!name || quantity<=0 || buyPrice<0 || currentPrice<0 || !purchaseDate) return res.status(400).json({error:"Nama, jumlah, harga, dan tanggal wajib valid."});
    if(action==="create" && String(req.body?.fundingMode||"") === "purchase" && !sourceAccount) return res.status(400).json({error:"Rekening sumber dana wajib dipilih untuk pembelian aset."});
    const costBasis=quantity*buyPrice*fxRate, existing=parseInvestment(data).find(x=>x.id===id);
    const txid=existing?.transactionId || (String(req.body?.fundingMode||"") === "purchase" ? (globalThis.crypto?.randomUUID?.()||("tx-"+Date.now())) : "");
    if(existing?.transactionId) await updatePurchaseTransaction(sheets,user.spreadsheet_id,existing.transactionId,costBasis,sourceAccount);
    else if(String(req.body?.fundingMode||"") === "purchase") {
      const d=transactionDate();
      await sheets.spreadsheets.values.append({spreadsheetId:user.spreadsheet_id,range:"Transaction!B10:I",valueInputOption:"USER_ENTERED",insertDataOption:"INSERT_ROWS",requestBody:{values:[[d.date,d.month,"Saving","Investment Purchase",`[asset-tx:${txid}] ${name}`,costBasis,sourceAccount,""]]}});
    }
    const s=await ensureSection(sheets,user.spreadsheet_id,data,"Managed Investment Assets",["ID","Nama","Kategori","Jumlah","Unit","Harga Beli","Harga Terkini","Rekening Sumber","Tanggal Beli","Catatan","Transaction ID","Mata Uang","Kurs","Cost Basis IDR"]);
    const refreshed=await rows(sheets,user.spreadsheet_id), row=findId(refreshed,s,id);
    const values=[[id,name,category,quantity,unit,buyPrice,currentPrice,sourceAccount,purchaseDate,note,txid,currency,fxRate,costBasis]];
    if(row<0) {
      const fresh=await rows(sheets,user.spreadsheet_id), sectionRow=section(fresh,"Managed Investment Assets");
      let targetRow=sectionRow+2; while(display(fresh[targetRow]?.[0])) targetRow++;
      await sheets.spreadsheets.values.update({spreadsheetId:user.spreadsheet_id,range:`'Asset Tracker'!A${targetRow+1}:N${targetRow+1}`,valueInputOption:"USER_ENTERED",requestBody:{values}});
    } else await sheets.spreadsheets.values.update({spreadsheetId:user.spreadsheet_id,range:`'Asset Tracker'!A${row}:N${row}`,valueInputOption:"USER_ENTERED",requestBody:{values}});
    return res.status(200).json({success:true,asset:{id,name,category,quantity,unit,buyPrice,currentPrice,sourceAccount,purchaseDate,note,transactionId:txid,currency,fxRate,costBasis}});
  } catch(e) {
    const x=e as Error & {status?:number}; console.error("managed-assets:",x.message); return res.status(x.status||500).json({error:x.message||"Gagal memproses aset"});
  }
}