import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";
import type { VercelRequest, VercelResponse } from "@vercel/node";

function sheetsClient(){const c=JSON.parse(process.env.GOOGLE_CREDENTIALS as string);const auth=new google.auth.JWT({email:c.client_email,key:c.private_key,scopes:["https://www.googleapis.com/auth/spreadsheets"]});return google.sheets({version:"v4",auth});}
const norm=(v:unknown)=>String(v??"").trim().replace(/\s+/g," ").toLowerCase();
const display=(v:unknown)=>String(v??"").trim().replace(/\s+/g," ");
const TYPE_MAP:Record<string,string>={income:"Income",expense:"Expense",saving:"Saving",transfer:"Transfer"};
async function validateWallets(sheets:ReturnType<typeof sheetsClient>,spreadsheetId:string,tx:any,type:string){
 const wallet=display(tx.wallet),toWallet=display(tx.toWallet);
 if(wallet&&toWallet&&norm(wallet)===norm(toWallet))throw new Error("Wallet asal dan tujuan harus berbeda");
 if(type==="Transfer"&&(!wallet||!toWallet))throw new Error("Transfer wajib memiliki Wallet asal dan To Wallet tujuan");
 if(type==="Saving"&&toWallet&&!wallet)throw new Error("Saving dengan To Wallet wajib memiliki Wallet asal");
 if((type==="Income"||type==="Expense")&&toWallet)throw new Error("To Wallet hanya boleh diisi untuk Transfer atau Saving");
 const meta=await sheets.spreadsheets.get({spreadsheetId,fields:"sheets.properties(sheetId,title)"});
 const setup=(meta.data.sheets||[]).find(s=>norm(s.properties?.title).replace(/\s/g,"")==="setup");
 if(!setup?.properties?.title)throw new Error("Tab Setup tidak ditemukan");
 const title=String(setup.properties.title).replace(/'/g,"''");
 const rr=await sheets.spreadsheets.values.get({spreadsheetId,range:`'${title}'!K1:L200`});
 const rows=rr.data.values||[];const header=rows.findIndex(r=>norm(r?.[0])==="category");if(header<0)throw new Error("Header bank Category tidak ditemukan");
 const active=new Map<string,string>();for(const r of rows.slice(header+1)){const name=display(r?.[0]);if(!name||norm(name)==="total")break;if(["true","yes","1","active","aktif","checked","✓"].includes(norm(r?.[1])))active.set(norm(name),name);}
 for(const name of [wallet,toWallet].filter(Boolean))if(!active.has(norm(name)))throw new Error(`Wallet "${name}" tidak ditemukan atau tidak aktif pada Setup`);
 return {wallet,toWallet};
}
export default async function handler(req:VercelRequest,res:VercelResponse){
 if(req.method!=="POST")return res.status(405).json({error:"Method Not Allowed"});
 const {token,sheetRow,transaction}=req.body||{};const row=Number(sheetRow);
 if(!token||!Number.isInteger(row)||row<10||!transaction)return res.status(400).json({error:"Data transaksi tidak lengkap"});
 const type=TYPE_MAP[String(transaction.type||"").trim().toLowerCase()],amount=Number(transaction.amount);
 const date=String(transaction.date||"").trim(),month=String(transaction.month||"").trim();
 let category=String(transaction.category||"").trim(),description=String(transaction.description||"").trim();
 if(type==="Transfer"){category="Transfer";if(!description)description=`Transfer ${display(transaction.wallet)} → ${display(transaction.toWallet)}`;}
 if(!type||!date||!month||(!category&&type!=="Transfer")||!description||!Number.isFinite(amount)||amount<=0)return res.status(400).json({error:"Data transaksi tidak valid"});
 try{
  const sb=createClient(process.env.SUPABASE_URL as string,process.env.SUPABASE_SERVICE_ROLE_KEY as string);
  const {data:u,error}=await sb.from("users").select("spreadsheet_id,is_active").eq("dashboard_token",token).single();
  if(error||!u)return res.status(404).json({error:"Akun tidak ditemukan"});if(!u.is_active)return res.status(403).json({error:"Akun belum aktif"});if(!u.spreadsheet_id)return res.status(404).json({error:"Spreadsheet belum terhubung ke akun ini"});
  const sheets=sheetsClient();let wallets:{wallet:string;toWallet:string};try{wallets=await validateWallets(sheets,u.spreadsheet_id,transaction,type);}catch(e){return res.status(400).json({error:(e as Error).message});}
  await sheets.spreadsheets.values.update({spreadsheetId:u.spreadsheet_id,range:`Transaction!B${row}:I${row}`,valueInputOption:"USER_ENTERED",requestBody:{values:[[date,month,type,category,description,amount,wallets.wallet,wallets.toWallet]]}});
  return res.status(200).json({success:true});
 }catch(e){console.error(e);return res.status(500).json({error:"Gagal mengubah transaksi"});}
}