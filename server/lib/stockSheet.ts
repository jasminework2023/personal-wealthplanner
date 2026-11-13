import { google } from "googleapis";

export const STOCK_TICKER_RE = /^[A-Za-z]{1,6}([.-][A-Za-z]{1,2})?$/;

export const STOCK_SECTION_LABELS = ["indonesia stock", "us stock"] as const;

const STOCK_STOP_LABELS = new Set([
  "total",
  "last update",
  "assets account",
  "descriptions",
  "cash in hand",
  "liquid assets",
  "investment assets",
  "indonesia stock",
  "us stock",
]);

export type StockMarket = "ID" | "US";

export type StockColumns = {
  ticker: number;
  currentPrice: number;
  shares: number;
  avgPrice: number;
  value: number;
  pl: number;
  account: number;
};

export type StockPosition = {
  ticker: string;
  market: StockMarket;
  shares: number;
  avgPrice: number;
  currentPrice: number;
  value: number;
  pl: number;
  account: string;
};

export type StockSection = {
  market: StockMarket;
  label: string;
  start: number;
  headerRow: number;
  subtotalRow: number;
  columns: StockColumns;
  stocks: StockPosition[];
  subtotalValue: number;
};

export type ResolvedStockSheet = {
  title: string;
  sheetId: number;
  rows: any[][];
};

const norm = (v: unknown) =>
  String(v ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/:$/, "")
    .trim()
    .toLowerCase();

const display = (v: unknown) => String(v ?? "").trim().replace(/\s+/g, " ");

export function parseNumber(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  let s = String(v ?? "").replace(/Rp|IDR|\$|\s/gi, "").trim();
  if (!s) return 0;
  const comma = s.lastIndexOf(",");
  const dot = s.lastIndexOf(".");
  if (comma !== -1 && dot !== -1) {
    s = comma > dot ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (comma !== -1) {
    s = s.length - comma - 1 === 3 ? s.replace(/,/g, "") : s.replace(",", ".");
  } else if (dot !== -1) {
    s = s.length - dot - 1 === 3 ? s.replace(/\./g, "") : s;
  }
  const n = Number(s.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function hasSection(rs: any[][], label: string): boolean {
  const target = norm(label);
  return rs.some((row) => (row || []).some((cell: unknown) => norm(cell) === target));
}

function sectionIndex(rs: any[][], label: string): number {
  const target = norm(label);
  return rs.findIndex((row) => (row || []).some((cell: unknown) => norm(cell) === target));
}

function headerAliases() {
  return {
    ticker: ["ticker", "symbol", "stock"],
    currentPrice: ["current", "current price", "harga sekarang", "harga saat ini"],
    shares: ["shares", "qty", "quantity", "jumlah", "lot"],
    avgPrice: ["avg", "avg price", "average price", "harga beli", "harga rata-rata"],
    value: ["value", "market value", "nilai"],
    pl: ["p/l", "pnl", "profit/loss", "unrealized p/l", "untung/rugi"],
    account: ["account", "investment account", "akun", "rekening"],
  } as const;
}

function matchesHeader(value: unknown, aliases: readonly string[]) {
  const label = norm(value);
  return aliases.some((alias) => label === alias || label.includes(alias));
}

export function detectStockColumns(rs: any[][], start: number): { headerRow: number; columns: StockColumns } {
  const aliases = headerAliases();
  for (let row = start; row <= Math.min(start + 3, rs.length - 1); row++) {
    const cells = rs[row] || [];
    const found: Record<string, number> = {};
    for (let col = 0; col < cells.length; col++) {
      for (const [key, list] of Object.entries(aliases)) {
        if (found[key] === undefined && matchesHeader(cells[col], list)) found[key] = col;
      }
    }
    if (
      found.ticker !== undefined &&
      found.currentPrice !== undefined &&
      found.shares !== undefined &&
      found.avgPrice !== undefined
    ) {
      return {
        headerRow: row,
        columns: {
          ticker: found.ticker,
          currentPrice: found.currentPrice,
          shares: found.shares,
          avgPrice: found.avgPrice,
          value: found.value ?? 4,
          pl: found.pl ?? 5,
          account: found.account ?? 6,
        },
      };
    }
  }

  return {
    headerRow: start + 1 < rs.length ? start + 1 : start,
    columns: {
      ticker: 0,
      currentPrice: 1,
      shares: 2,
      avgPrice: 3,
      value: 4,
      pl: 5,
      account: 6,
    },
  };
}

function isValidStockRow(row: any[], columns: StockColumns): boolean {
  const ticker = display(row[columns.ticker]);
  const shares = parseNumber(row[columns.shares]);
  const currentPrice = parseNumber(row[columns.currentPrice]);
  const avgPrice = parseNumber(row[columns.avgPrice]);
  return STOCK_TICKER_RE.test(ticker) && shares > 0 && (currentPrice > 0 || avgPrice > 0);
}

export function parseStockSection(rs: any[][], sectionLabel: string): StockSection {
  const market: StockMarket = norm(sectionLabel) === "us stock" ? "US" : "ID";
  const start = sectionIndex(rs, sectionLabel);
  if (start < 0) {
    return {
      market,
      label: sectionLabel,
      start: -1,
      headerRow: -1,
      subtotalRow: -1,
      columns: { ticker: 0, currentPrice: 1, shares: 2, avgPrice: 3, value: 4, pl: 5, account: 6 },
      stocks: [],
      subtotalValue: 0,
    };
  }

  const { headerRow, columns } = detectStockColumns(rs, start);
  const stocks: StockPosition[] = [];
  let subtotalValue = 0;
  let subtotalRow = -1;
  let blankRows = 0;

  for (let i = headerRow + 1; i < rs.length; i++) {
    const row = rs[i] || [];
    const rawTicker = display(row[columns.ticker]);
    const label = norm(rawTicker);

    if (!rawTicker) {
      blankRows += 1;
      if (blankRows >= 2) break;
      continue;
    }
    blankRows = 0;

    if (label === "total" || label.includes("subtotal")) {
      subtotalRow = i;
      break;
    }
    if (label !== norm(sectionLabel) && STOCK_STOP_LABELS.has(label)) break;
    if (!isValidStockRow(row, columns)) continue;

    const currentPrice = parseNumber(row[columns.currentPrice]);
    const shares = parseNumber(row[columns.shares]);
    const avgPrice = parseNumber(row[columns.avgPrice]);
    const value = currentPrice * shares;
    const pl = (currentPrice - avgPrice) * shares;

    subtotalValue += value;
    stocks.push({
      ticker: rawTicker,
      market,
      shares,
      avgPrice,
      currentPrice,
      value,
      pl,
      account: display(row[columns.account]),
    });
  }

  return { market, label: sectionLabel, start, headerRow, subtotalRow, columns, stocks, subtotalValue };
}

export function parseStockSections(rs: any[][]) {
  return {
    id: parseStockSection(rs, "Indonesia Stock"),
    us: parseStockSection(rs, "US Stock"),
  };
}

export async function resolveStockSheet(
  sheets: any,
  spreadsheetId: string,
  options: { createIfMissing?: boolean } = {},
): Promise<ResolvedStockSheet | null> {
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties(sheetId,title)",
  });
  const assetTracker = (meta.data.sheets || []).find(
    (x: any) => norm(x.properties?.title) === "asset tracker",
  );

  if (!assetTracker) {
    if (options.createIfMissing) {
      throw new Error("Tab Asset Tracker tidak ditemukan");
    }
    return null;
  }

  const title = String(assetTracker.properties.title);
  const values = (
    await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: title + "!A1:O500",
    })
  ).data.values || [];

  if (!hasSection(values, "Indonesia Stock") && !hasSection(values, "US Stock")) {
    if (!options.createIfMissing) return null;
    return {
      title,
      sheetId: Number(assetTracker.properties.sheetId),
      rows: values,
    };
  }

  return {
    title,
    sheetId: Number(assetTracker.properties.sheetId),
    rows: values,
  };
}

export function findStockRow(rs: any[][], ticker: string, market: StockMarket) {
  const label = market === "ID" ? "Indonesia Stock" : "US Stock";
  const parsed = parseStockSection(rs, label);
  if (parsed.start < 0) return { ...parsed, row: -1 };

  const wanted = norm(ticker);
  let blankRows = 0;

  for (let i = parsed.headerRow + 1; i < rs.length; i++) {
    const row = rs[i] || [];
    const rawTicker = display(row[parsed.columns.ticker]);
    const labelNorm = norm(rawTicker);

    if (!rawTicker) {
      blankRows += 1;
      if (blankRows >= 2) break;
      continue;
    }
    blankRows = 0;

    if (labelNorm === "total" || labelNorm.includes("subtotal")) break;
    if (labelNorm !== norm(label) && STOCK_STOP_LABELS.has(labelNorm)) break;
    if (labelNorm === wanted) return { ...parsed, row: i };
  }

  return { ...parsed, row: -1 };
}

export async function readStockPortfolio(
  sheets: any,
  spreadsheetId: string,
  options: { createIfMissing?: boolean } = {},
) {
  const resolved = await resolveStockSheet(sheets, spreadsheetId, options);
  if (!resolved) {
    return { sheet: null, holdings: [], sections: parseStockSections([]) };
  }

  const sections = parseStockSections(resolved.rows);
  const holdings = [...sections.id.stocks, ...sections.us.stocks];
  return { sheet: resolved, holdings, sections };
}

export async function writeStockPosition(
  sheets: any,
  spreadsheetId: string,
  params: {
    ticker: string;
    market: StockMarket;
    shares: number;
    avgPrice: number;
    account: string;
    currentPrice: number;
  },
) {
  const resolved = await resolveStockSheet(sheets, spreadsheetId, { createIfMissing: true });
  if (!resolved) throw new Error("Tab Asset Tracker tidak ditemukan");

  const found = findStockRow(resolved.rows, params.ticker, params.market);
  if (found.start < 0) {
    throw Object.assign(
      new Error(
        "Section " +
          (params.market === "ID" ? "Indonesia Stock" : "US Stock") +
          " tidak ditemukan di tab Asset Tracker. Tambahkan label section itu di sheet.",
      ),
      { status: 400 },
    );
  }

  const value = params.currentPrice * params.shares;
  const pl = (params.currentPrice - params.avgPrice) * params.shares;
  const c = found.columns;

  const rowNumber =
    found.row >= 0
      ? found.row + 1
      : (() => {
          if (found.subtotalRow >= 0) return found.subtotalRow + 1;
          for (let i = found.headerRow + 1; i < resolved.rows.length; i++) {
            const row = resolved.rows[i] || [];
            const label = norm(row[found.columns.ticker]);
            if (label === "total" || label.includes("subtotal")) return i + 1;
            if (!row.some((cell: unknown) => display(cell))) return i + 1;
            if (STOCK_STOP_LABELS.has(label) && label !== norm(found.label)) return i + 1;
          }
          return resolved.rows.length + 1;
        })();

  const values = [...(resolved.rows[rowNumber - 1] || [])];
  const width = Math.max(
    7,
    resolved.rows[found.headerRow]?.length || 7,
    c.account + 1,
  );
  while (values.length < width) values.push("");

  values[c.ticker] = params.ticker;
  values[c.currentPrice] = params.currentPrice;
  values[c.shares] = params.shares;
  values[c.avgPrice] = params.avgPrice;
  values[c.value] = value;
  values[c.pl] = pl;
  values[c.account] = params.account;

  if (found.row >= 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range:
        resolved.title +
        "!A" +
        rowNumber +
        ":" +
        columnLetter(width - 1) +
        rowNumber,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [values] },
    });
    return resolved;
  }

  const reusableBlank =
    rowNumber <= resolved.rows.length &&
    !(resolved.rows[rowNumber - 1] || []).some((cell: unknown) => display(cell));

  if (!reusableBlank) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            insertDimension: {
              range: {
                sheetId: resolved.sheetId,
                dimension: "ROWS",
                startIndex: rowNumber - 1,
                endIndex: rowNumber,
              },
              inheritFromBefore: true,
            },
          },
        ],
      },
    });
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range:
      resolved.title +
      "!A" +
      rowNumber +
      ":" +
      columnLetter(width - 1) +
      rowNumber,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [values] },
  });

  return resolved;
}

export async function deleteStockPosition(
  sheets: any,
  spreadsheetId: string,
  ticker: string,
  market: StockMarket,
) {
  const resolved = await resolveStockSheet(sheets, spreadsheetId, { createIfMissing: false });
  const diagnostics = {
    ticker,
    market,
    tab: resolved?.title || "tidak ditemukan",
    rowsRead: resolved?.rows.length || 0,
  };

  if (!resolved) {
    console.error("Stock delete: saham tidak ditemukan", diagnostics);
    throw Object.assign(
      new Error("Saham " + ticker + " tidak ditemukan di tab " + diagnostics.tab),
      { status: 404 },
    );
  }

  const found = findStockRow(resolved.rows, ticker, market);
  if (found.row < 0) {
    console.error("Stock delete: saham tidak ditemukan", diagnostics);
    throw Object.assign(
      new Error("Saham " + ticker + " tidak ditemukan di tab " + resolved.title),
      { status: 404 },
    );
  }

  const rowNumber = found.row + 1;
  const width = Math.max(7, resolved.rows[found.row]?.length || 7);
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: resolved.title + "!A" + rowNumber + ":" + columnLetter(width) + rowNumber,
  });

  return resolved;
}

export function columnLetter(index: number): string {
  let n = index + 1;
  let out = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}
