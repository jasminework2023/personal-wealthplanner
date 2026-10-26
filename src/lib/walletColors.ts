const BRAND_COLORS: Record<string, string> = {
  bca:"#1A5FD0", mandiri:"#003D79", bni:"#F15A22", bri:"#00529C", cimb:"#B02A3F",
  gopay:"#00AA13", ovo:"#4C3494", dana:"#118EEA", shopeepay:"#EE4D2D", jago:"#FFB800",
  linkaja:"#E82529", stockbit:"#24382E", cash:"#0B7A52", tunai:"#0B7A52",
  "cash in hand":"#0B7A52", lainnya:"#4B5563", other:"#4B5563",
};

export function normalizeWalletName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

function hexToRgb(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}
function rgbToHex(rgb: [number, number, number]): string {
  return "#" + rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("").toUpperCase();
}
function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return rgbToHex([f(0) * 255, f(8) * 255, f(4) * 255]);
}
function luminance(hex: string): number {
  const rgb = hexToRgb(hex).map((v) => v / 255).map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}
export function contrastRatio(hex: string): number {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return 1;
  return 1.05 / (luminance(hex) + 0.05);
}
function ensureWhiteContrast(hex: string): string {
  let [r, g, b] = hexToRgb(hex);
  for (let i = 0; i < 30 && contrastRatio(rgbToHex([r, g, b])) < 4.5; i++) {
    r *= 0.88; g *= 0.88; b *= 0.88;
  }
  return rgbToHex([r, g, b]);
}
function darken(hex: string, factor: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex([r * factor, g * factor, b * factor]);
}

export function resolveWalletColor(name: string, mode: "auto" | "custom" = "auto", customHex?: string | null): string {
  if (mode === "custom" && customHex && /^#[0-9a-f]{6}$/i.test(customHex)) return ensureWhiteContrast(customHex);
  const n = normalizeWalletName(name);
  const words = n.split(/[^a-z0-9]+/).filter(Boolean);
  let base = "";
  for (const [key, value] of Object.entries(BRAND_COLORS)) {
    if (n.includes(key) || words.includes(key)) { base = value; break; }
  }
  if (!base) {
    let hash = 0;
    for (const c of n) hash = (hash * 31 + c.charCodeAt(0)) | 0;
    base = hslToHex(Math.abs(hash) % 360, 48, 34);
  }
  return ensureWhiteContrast(base);
}

export function walletGradient(base: string): string {
  const safe = /^#[0-9a-f]{6}$/i.test(base) ? base : "#0B4D38";
  return `linear-gradient(145deg, ${darken(safe, 0.65)}, ${safe})`;
}
