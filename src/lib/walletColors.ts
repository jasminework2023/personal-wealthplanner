const BRAND_COLORS: Record<string, string> = {
  bca:"#1A5FD0", mandiri:"#003D79", bni:"#F15A22", bri:"#00529C", cimb:"#B02A3F",
  gopay:"#00AA13", ovo:"#4C3494", dana:"#118EEA", shopeepay:"#EE4D2D", jago:"#FFB800",
  linkaja:"#E82529", stockbit:"#24382E", cash:"#0B7A52", tunai:"#0B7A52",
  lainnya:"#4B5563", other:"#4B5563",
};
export function normalizeWalletName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}
export function resolveWalletColor(name: string, mode: "auto" | "custom" = "auto", customHex?: string | null): string {
  if (mode === "custom" && customHex && /^#[0-9a-f]{6}$/i.test(customHex)) return customHex;
  const normalized = normalizeWalletName(name);
  for (const [brand, color] of Object.entries(BRAND_COLORS)) if (normalized.includes(brand)) return color;
  let hash = 0;
  for (const char of normalized) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return `hsl(${Math.abs(hash) % 360} 48% 34%)`;
}
function hslToRgb(h:number,s:number,l:number) {
 const a=s*Math.min(l,1-l);
 const f=(n:number)=>{const k=(n+h/30)%12;return l-a*Math.max(-1,Math.min(k-3,9-k,1));};
 return [f(0),f(8),f(4)].map(v=>Math.round(v*255));
}
function luminance(rgb:number[]) {const c=rgb.map(v=>{const x=v/255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;});return .2126*c[0]+.7152*c[1]+.0722*c[2];}
export function contrastRatio(hex:string):number {
 if(!/^#[0-9a-f]{6}$/i.test(hex))return 1;
 const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));const l=luminance(rgb);return 1.05/(l+.05);
}
export function walletGradient(base:string):string { return `linear-gradient(145deg, ${base}, ${base})`; }
