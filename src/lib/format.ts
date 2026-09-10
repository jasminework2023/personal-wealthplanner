export function formatRupiah(n: number): string {
  const rounded = Math.round(n);
  return "Rp" + rounded.toLocaleString("id-ID");
}

export function formatCompact(n: number): string {
  if (Math.abs(n) >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2).replace(/\.00$/, "") + "M";
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "jt";
  return formatRupiah(n);
}

export function formatPercent(n: number): string {
  return n.toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 2 }) + "%";
}
