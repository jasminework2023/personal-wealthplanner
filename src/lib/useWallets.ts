import { useCallback, useEffect, useState } from "react";
import { getStoredToken } from "./useFinanceData";

export interface Wallet {
  id:string; name:string; type:"cash"|"bank"|"investment"|"other";
  colorMode:"auto"|"custom"; color:string|null; resolvedColor:string;
  openingBalance:number; balance:number; txCount:number; sortOrder:number;
}
export interface WalletsData { wallets:Wallet[]; unassigned:{count:number;net:number}; totalBalance:number; }
const cache=new Map<string,{at:number;promise:Promise<{ok:boolean;data:any}>}>();
function sharedFetch(url:string,ttl=15000) {
 const now=Date.now(),hit=cache.get(url);if(hit&&now-hit.at<ttl)return hit.promise;
 const promise=fetch(url).then(async r=>({ok:r.ok,data:await r.json().catch(()=>({}))})).catch(e=>{cache.delete(url);throw e;});
 cache.set(url,{at:now,promise});return promise;
}
export function useWallets() {
 const [data,setData]=useState<WalletsData>({wallets:[],unassigned:{count:0,net:0},totalBalance:0});
 const [loading,setLoading]=useState(true);const [error,setError]=useState<string|null>(null);
 const refresh=useCallback(async(force=false)=>{
  const token=getStoredToken();if(!token){setLoading(false);return;}
  const url=`/api/wallets?token=${encodeURIComponent(token)}`;if(force)cache.delete(url);
  setLoading(true);
  try{const r=await sharedFetch(url,force?0:15000);if(!r.ok)throw new Error(r.data?.error||"Gagal memuat wallet");setData(r.data);setError(null);}
  catch(e){setError(e instanceof Error?e.message:"Gagal memuat wallet");}
  finally{setLoading(false);}
 },[]);
 useEffect(()=>{void refresh();const changed=()=>void refresh(true);window.addEventListener("wealthplanner:transaction-added",changed);window.addEventListener("wealthplanner:setup-changed",changed);return()=>{window.removeEventListener("wealthplanner:transaction-added",changed);window.removeEventListener("wealthplanner:setup-changed",changed);};},[refresh]);
 return { ...data, loading, error, refresh };
}
