import type { AssetGroup, Stock } from "./types";

export const assetGroups: AssetGroup[] = [
  {
    group: "Liquid Assets",
    items: [
      { name: "Cash in Hand", value: 5000000 },
      { name: "Deposito BCA", value: 15000000 },
      { name: "Deposito CIMB", value: 10000000 },
      { name: "Saldo RDN", value: 4000000 },
    ],
  },
  {
    group: "Investment Assets",
    items: [
      { name: "Saham", value: 25000000 },
      { name: "Obligasi", value: 8000000 },
      { name: "Reksadana", value: 7000000 },
      { name: "Emas", value: 5000000 },
    ],
  },
];

export const totalAssets = assetGroups.reduce(
  (sum, g) => sum + g.items.reduce((s, i) => s + i.value, 0),
  0
);

export const assetTarget = 1000000000;
export const usdRate = 16300; // Rp per USD, dipakai buat estimasi ekuivalen

export const stocksID: Stock[] = [
  { ticker: "ACES", market: "ID", currentPrice: 785, shares: 2000, avgPrice: 700 },
  { ticker: "BBCA", market: "ID", currentPrice: 9800, shares: 500, avgPrice: 9200 },
  { ticker: "BBRI", market: "ID", currentPrice: 4650, shares: 1000, avgPrice: 4300 },
  { ticker: "INDF", market: "ID", currentPrice: 7200, shares: 300, avgPrice: 6800 },
];

export const stocksUS: Stock[] = [
  { ticker: "NVDA", market: "US", currentPrice: 135, shares: 10, avgPrice: 110 },
  { ticker: "AAPL", market: "US", currentPrice: 228, shares: 8, avgPrice: 190 },
  { ticker: "TSLA", market: "US", currentPrice: 245, shares: 5, avgPrice: 260 },
  { ticker: "MSFT", market: "US", currentPrice: 420, shares: 4, avgPrice: 380 },
  { ticker: "ABNB", market: "US", currentPrice: 132, shares: 6, avgPrice: 140 },
];

export function stockValue(s: Stock) {
  return s.currentPrice * s.shares;
}
export function stockPL(s: Stock) {
  return (s.currentPrice - s.avgPrice) * s.shares;
}
