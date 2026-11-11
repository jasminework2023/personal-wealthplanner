import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const TICKER_RE = /^[A-Za-z]{1,6}([.-][A-Za-z]{1,2})?$/;
const SECTION_LABELS = ["liquid assets", "investment assets", "indonesia stock", "us stock"];
const STOCK_STOP_LABELS = new Set([
  "total",
  "last update",
  "assets account",
  "descriptions",
  "cash in hand",
  ...SECTION_LABELS,
]);

const norm = (v: unknown) =>
  String(v ?? "").trim().replace(/\s+/g, " ").replace(/:$/, "").trim().toLowerCase();
const display = (v: unknown) => String(v ?? "").trim().replace(/\s+/g, " ");

function num(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  let s = String(v ?? "").replace(/Rp|IDR|\$|\s/gi, "").trim();
  if (!s) return 0;
  const comma = s.lastIndexOf(",");
  const dot = s.lastIndexOf(".");
  if (comma !== -1 && dot !== -1) {
    s = comma > dot ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (comma !== -1) {
    const decimals = s.length - comma - 1;
    s = decimals === 3 ? s.replace(/,/g, "") : s.replace(",", ".");
  } else if (dot !== -1) {
    const decimals = s.length - dot - 1;
    s = decimals === 3 ? s.replace(/\./g, "") : s;
  }
  const n = Number(s.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

async function auth(token: string) {
  const sb = createClient(
    process.env.SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  );
  const { data: user, error } = await sb
    .from("users")
    .select("username,spreadsheet_id,is_active")
    .eq("dashboard_token", token)
    .single();

  if (error || !user) throw Object.assign(new Error("Link tidak valid"), { status: 404 });
  if (!user.is_active) throw Object.assign(new Error("Akun belum aktif"), { status: 403 });
  if (!user.spreadsheet_id) throw Object.assign(new Error("Spreadsheet belum tersedia"), { status: 404 });
  return user;
}

function sheetsClient() {
  const c = JSON.parse(process.env.GOOGLE_CREDENTIALS as string);
  const a = new google.auth.JWT({
    email: c.client_email,
    key: c.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth: a });
}

async function rows(s: any, id: string) {
  return (await s.spreadsheets.values.get({
    spreadsheetId: id,
    range: "Asset Tracker!A1:N100",
  })).data.values || [];
}

function section(rs: any[][], label: string) {
  const target = norm(label);
  return rs.findIndex((r) =>
    (r || []).some((cell: unknown) => norm(cell) === target),
  );
}

function stockTableLayout(rs: any[][], start: number) {
  const aliases: Record<string, string[]> = {
    ticker: ["ticker", "symbol", "stock"],
    currentPrice: ["current", "current price", "harga sekarang", "harga saat ini"],
    shares: ["shares", "qty", "quantity", "jumlah", "lot"],
    avgPrice: ["avg", "avg price", "average price", "harga beli", "harga rata-rata"],
    value: ["value", "market value", "nilai"],
    pl: ["p/l", "pl", "unrealized p/l", "unrealized"],
    account: ["account", "investment account", "akun", "rekening"],
  };
  const matches = (value: unknown, list: string[]) => {
    const label = norm(value);
    return list.some((alias) => label === alias || label.includes(alias));
  };

  for (let row = start; row <= Math.min(start + 3, rs.length - 1); row++) {
    const cells = rs[row] || [];
    const columns: Record<string, number> = {};
    for (let col = 0; col < cells.length; col++) {
      for (const [key, list] of Object.entries(aliases)) {
        if (columns[key] === undefined && matches(cells[col], list)) columns[key] = col;
      }
    }
    if (
      columns.ticker !== undefined &&
      columns.currentPrice !== undefined &&
      columns.shares !== undefined &&
      columns.avgPrice !== undefined
    ) {
      return { headerRow: row, columns };
    }
  }

  return {
    headerRow: start,
    columns: { ticker: 0, currentPrice: 1, shares: 2, avgPrice: 3, value: 4, pl: 5, account: 6 },
  };
}

function isValidStockRow(r: any[], columns: Record<string, number>): boolean {
  const ticker = display(r[columns.ticker]);
  const shares = num(r[columns.shares]);
  const currentPrice = num(r[columns.currentPrice]);
  const avgPrice = num(r[columns.avgPrice]);
  return TICKER_RE.test(ticker) && shares > 0 && (currentPrice > 0 || avgPrice > 0);
}

function read(rs: any[][]) {
  const out: any[] = [];

  for (const [market, label] of [["ID", "Indonesia Stock"], ["US", "US Stock"]] as const) {
    const start = section(rs, label);
    if (start < 0) continue;

    const layout = stockTableLayout(rs, start);
    let blankRows = 0;
    for (let i = layout.headerRow + 1; i < rs.length; i++) {
      const r = rs[i] || [];
      const ticker = display(r[layout.columns.ticker]);
      const labelNorm = norm(ticker);

      if (!ticker) {
        blankRows += 1;
        if (blankRows >= 2) break;
        continue;
      }
      blankRows = 0;

      if (labelNorm === "total" || labelNorm.includes("subtotal")) break;
      if (labelNorm !== norm(label) && STOCK_STOP_LABELS.has(labelNorm)) break;
      if (!isValidStockRow(r, layout.columns)) continue;

      const currentPrice = num(r[layout.columns.currentPrice]);
      const shares = num(r[layout.columns.shares]);
      const avgPrice = num(r[layout.columns.avgPrice]);
      const value = currentPrice * shares;
      const pl = (currentPrice - avgPrice) * shares;

      out.push({
        ticker,
        market,
        shares,
        avgPrice,
        currentPrice,
        value,
        pl,
        account: layout.columns.account !== undefined ? display(r[layout.columns.account]) : "",
      });
    }
  }

  return out;
}

function columnName(index: number): string {
  let n = index + 1;
  let out = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

function writeStockCells(
  s: any,
  id: string,
  rowNumber: number,
  columns: Record<string, number>,
  values: { ticker: string; current: number; shares: number; avg: number; value: number; pl: number; account: string },
) {
  const entries: Array<[string, unknown]> = [
    ["ticker", values.ticker],
    ["currentPrice", values.current],
    ["shares", values.shares],
    ["avgPrice", values.avg],
    ["value", values.value],
    ["pl", values.pl],
    ["account", values.account],
  ];
  const present = entries.filter(([key]) => columns[key] !== undefined);
  if (!present.length) throw new Error("Kolom Stock Portfolio tidak ditemukan.");

  const minCol = Math.min(...present.map(([key]) => columns[key]));
  const maxCol = Math.max(...present.map(([key]) => columns[key]));
  const row = Array.from({ length: maxCol - minCol + 1 }, () => "");
  for (const [key, value] of present) row[columns[key] - minCol] = value;

  return s.spreadsheets.values.update({
    spreadsheetId: id,
    range: "Asset Tracker!" + columnName(minCol) + rowNumber + ":" + columnName(maxCol) + rowNumber,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [row] },
  });
}

function findStockRow(rs: any[][], ticker: string, market: "ID" | "US") {
  const label = market === "ID" ? "Indonesia Stock" : "US Stock";
  const start = section(rs, label);
  if (start < 0) return { start: -1, row: -1, subtotal: -1, columns: null as Record<string, number> | null };

  const layout = stockTableLayout(rs, start);
  let subtotal = -1;
  let blankRows = 0;
  for (let i = layout.headerRow + 1; i < rs.length; i++) {
    const r = rs[i] || [];
    const value = display(r[layout.columns.ticker]);
    const k = norm(value);

    if (!value) {
      blankRows += 1;
      if (blankRows >= 2) break;
      continue;
    }
    blankRows = 0;

    const rowLabels = r.map((cell: unknown) => norm(cell)).filter(Boolean);
    if (rowLabels.some((cell) => cell === "total" || cell === "subtotal" || cell.includes("subtotal"))) {
      subtotal = i;
      break;
    }
    if (k !== norm(label) && STOCK_STOP_LABELS.has(k)) break;
    if (k === norm(ticker)) return { start, row: i, subtotal, columns: layout.columns };
  }

  return { start, row: -1, subtotal, columns: layout.columns };
}

async function writePosition(
  s: any,
  id: string,
  ticker: string,
  market: "ID" | "US",
  shares: number,
  avg: number,
  account: string,
  current?: number,
) {
  const rs = await rows(s, id);
  const label = market === "ID" ? "Indonesia Stock" : "US Stock";
  const found = findStockRow(rs, ticker, market);
  if (found.start < 0 || !found.columns) {
    throw new Error("Section " + label + " tidak ditemukan di Asset Tracker.");
  }

  const currentPrice = current ?? await price(ticker, market);
  const value = currentPrice * shares;
  const pl = (currentPrice - avg) * shares;

  if (found.row >= 0) {
    await writeStockCells(s, id, found.row + 1, found.columns, {
      ticker, current: currentPrice, shares, avg, value, pl, account,
    });
    return;
  }

  let insertAt = found.subtotal;
  if (insertAt < 0) {
    for (let i = found.start + 1; i < rs.length; i++) {
      const r = rs[i] || [];
      const first = norm(r[found.columns.ticker]);
      const rowLabels = r.map((cell: unknown) => norm(cell)).filter(Boolean);
      const isStop = rowLabels.some((cell: string) => cell === "total" || cell === "subtotal" || cell.includes("subtotal"))
        || (first !== norm(label) && STOCK_STOP_LABELS.has(first));
      if (isStop) {
        insertAt = i;
        break;
      }
      if (!r.some((cell: unknown) => display(cell))) {
        insertAt = i;
        break;
      }
    }
    if (insertAt < 0) insertAt = rs.length;
  }

  const meta = await s.spreadsheets.get({
    spreadsheetId: id,
    fields: "sheets.properties(sheetId,title)",
  });
  const sh = (meta.data.sheets || []).find(
    (x: any) => norm(x.properties?.title) === "asset tracker",
  );
  if (!sh) throw new Error("Tab Asset Tracker tidak ditemukan.");

  const reusableBlank = insertAt < rs.length && !(rs[insertAt] || []).some((cell: unknown) => display(cell));
  if (!reusableBlank) {
    await s.spreadsheets.batchUpdate({
      spreadsheetId: id,
      requestBody: {
        requests: [{
          insertDimension: {
            range: {
              sheetId: Number(sh.properties.sheetId),
              dimension: "ROWS",
              startIndex: insertAt,
              endIndex: insertAt + 1,
            },
            inheritFromBefore: true,
          },
        }],
      },
    });
  }

  await writeStockCells(s, id, insertAt + 1, found.columns, {
    ticker, current: currentPrice, shares, avg, value, pl, account,
  });
}

async function deletePosition(s: any, id: string, ticker: string, market: "ID" | "US") {
  const rs = await rows(s, id);
  const found = findStockRow(rs, ticker, market);
  if (found.row < 0) {
    throw Object.assign(new Error("Saham tidak ditemukan"), { status: 404 });
  }

  const n = found.row + 1;
  const columns = found.columns || { ticker: 0, currentPrice: 1, shares: 2, avgPrice: 3, value: 4, pl: 5, account: 6 };
  const minCol = Math.min(...Object.values(columns));
  const maxCol = Math.max(...Object.values(columns));
  await s.spreadsheets.values.clear({
    spreadsheetId: id,
    range: "Asset Tracker!" + columnName(minCol) + n + ":" + columnName(maxCol) + n,
  });
}

async function price(ticker: string, market: "ID" | "US") {
  const symbol = market === "ID" ? ticker + ".JK" : ticker;
  const u =
    "https://query1.finance.yahoo.com/v8/finance/chart/" +
    encodeURIComponent(symbol) +
    "?range=1d&interval=1m";
  const r = await fetch(u, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!r.ok) throw new Error("Price provider HTTP " + r.status);
  const j: any = await r.json();
  const p = Number(
    j?.chart?.result?.[0]?.meta?.regularMarketPrice ??
    j?.chart?.result?.[0]?.meta?.previousClose,
  );
  if (!Number.isFinite(p) || p <= 0) throw new Error("Harga tidak tersedia");
  return p;
}

function findStockRow(rs: any[][], ticker: string, market: "ID" | "US") {
  const label = market === "ID" ? "Indonesia Stock" : "US Stock";
  const start = section(rs, label);
  if (start < 0) return { start: -1, row: -1, subtotal: -1 };

  let subtotal = -1;
  let blankRows = 0;
  for (let i = start + 1; i < rs.length; i++) {
    const r = rs[i] || [];
    const value = display(r[0]);
    const k = norm(value);

    if (!value) {
      blankRows += 1;
      if (blankRows >= 2) break;
      continue;
    }
    blankRows = 0;

    const rowLabels = r.map((cell: unknown) => norm(cell)).filter(Boolean);
    if (rowLabels.some((cell) => cell === "total" || cell === "subtotal" || cell.includes("subtotal"))) {
      subtotal = i;
      break;
    }
    if (k !== norm(label) && STOCK_STOP_LABELS.has(k)) break;
    if (k === norm(ticker)) return { start, row: i, subtotal };
  }

  return { start, row: -1, subtotal };
}

async function writePosition(
  s: any,
  id: string,
  ticker: string,
  market: "ID" | "US",
  shares: number,
  avg: number,
  account: string,
  current?: number,
) {
  const rs = await rows(s, id);
  const label = market === "ID" ? "Indonesia Stock" : "US Stock";
  const found = findStockRow(rs, ticker, market);
  if (found.start < 0) {
    throw new Error("Section " + (market === "ID" ? "Indonesia Stock" : "US Stock") + " tidak ditemukan di Asset Tracker.");
  }

  const currentPrice = current ?? await price(ticker, market);
  const value = currentPrice * shares;
  const pl = (currentPrice - avg) * shares;

  if (found.row >= 0) {
    const n = found.row + 1;
    await s.spreadsheets.values.update({
      spreadsheetId: id,
      range: "Asset Tracker!A" + n + ":G" + n,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [[ticker, currentPrice, shares, avg, value, pl, account]] },
    });
    return;
  }

  // Do not require a manually maintained Total/Subtotal row. If one exists,
  // insert before it; otherwise use the first blank row in the section, or append
  // directly after the section's existing rows.
  let insertAt = found.subtotal;
  if (insertAt < 0) {
    for (let i = found.start + 1; i < rs.length; i++) {
      const r = rs[i] || [];
      const first = norm(r[0]);
      const rowLabels = r.map((cell: unknown) => norm(cell)).filter(Boolean);
      const isStop = rowLabels.some((cell: string) => cell === "total" || cell === "subtotal" || cell.includes("subtotal"))
        || (first !== norm(label) && STOCK_STOP_LABELS.has(first));
      if (isStop) {
        insertAt = i;
        break;
      }
      if (!r.some((cell: unknown) => display(cell))) {
        insertAt = i;
        break;
      }
    }
    if (insertAt < 0) insertAt = rs.length;
  }

  const meta = await s.spreadsheets.get({
    spreadsheetId: id,
    fields: "sheets.properties(sheetId,title)",
  });
  const sh = (meta.data.sheets || []).find(
    (x: any) => norm(x.properties?.title) === "asset tracker",
  );
  if (!sh) throw new Error("Tab Asset Tracker tidak ditemukan.");

  // Only insert a new row when there is no reusable blank row.
  const reusableBlank = insertAt < rs.length && !(rs[insertAt] || []).some((cell: unknown) => display(cell));
  if (!reusableBlank) {
    await s.spreadsheets.batchUpdate({
      spreadsheetId: id,
      requestBody: {
        requests: [{
          insertDimension: {
            range: {
              sheetId: Number(sh.properties.sheetId),
              dimension: "ROWS",
              startIndex: insertAt,
              endIndex: insertAt + 1,
            },
            inheritFromBefore: true,
          },
        }],
      },
    });
  }

  const n = insertAt + 1;
  await s.spreadsheets.values.update({
    spreadsheetId: id,
    range: "Asset Tracker!A" + n + ":G" + n,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [[ticker, currentPrice, shares, avg, value, pl, account]] },
  });
}

async function deletePosition(s: any, id: string, ticker: string, market: "ID" | "US") {
  const rs = await rows(s, id);
  const found = findStockRow(rs, ticker, market);
  if (found.row < 0) {
    throw Object.assign(new Error("Saham tidak ditemukan"), { status: 404 });
  }

  const n = found.row + 1;
  await s.spreadsheets.values.clear({
    spreadsheetId: id,
    range: "Asset Tracker!A" + n + ":N" + n,
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const token = String(
    req.method === "GET" ? req.query.token || "" : req.body?.token || "",
  ).trim();
  if (!token) return res.status(400).json({ error: "Token tidak ditemukan" });

  try {
    const user = await auth(token);
    const s = sheetsClient();

    if (req.method === "GET") {
      let holdings = read(await rows(s, user.spreadsheet_id));
      let status = "";

      if (String(req.query.refresh || "") === "1") {
        for (const h of holdings) {
          try {
            await writePosition(
              s,
              user.spreadsheet_id,
              h.ticker,
              h.market,
              h.shares,
              h.avgPrice,
              h.account,
              await price(h.ticker, h.market),
            );
          } catch {
            status = "Sebagian harga belum bisa diperbarui.";
          }
        }
        holdings = read(await rows(s, user.spreadsheet_id));
      }

      const accounts = Array.from(
        new Map(
          holdings
            .filter((h) => h.account)
            .map((h) => [
              norm(h.account),
              {
                id: norm(h.account).replace(/[^a-z0-9]+/g, "-"),
                name: h.account,
                broker: h.account,
                rdnWallet: "",
              },
            ]),
        ).values(),
      );

      return res.status(200).json({
        holdings,
        accounts,
        priceStatus: status || (String(req.query.refresh || "") === "1" ? "Harga diperbarui." : ""),
      });
    }

    if (req.method === "POST") {
      const body = req.body || {};
      const ticker = display(body.ticker).toUpperCase();
      const market: "ID" | "US" = body.market === "US" ? "US" : "ID";
      const shares = Number(body.shares);
      const avg = Number(body.avgPrice);
      const account = display(body.account);
      const mode = body.mode === "buy" ? "buy" : "set";

      if (!ticker || !TICKER_RE.test(ticker) || !Number.isFinite(shares) || shares <= 0 || !Number.isFinite(avg) || avg < 0) {
        return res.status(400).json({ error: "Ticker, quantity, dan harga beli wajib diisi." });
      }
      if (!account) return res.status(400).json({ error: "Investment Account wajib dipilih." });

      const rs = await rows(s, user.spreadsheet_id);
      const found = findStockRow(rs, ticker, market);

      if (mode === "buy" && found.row >= 0) {
        const existing = rs[found.row] || [];
        const oldShares = num(existing[2]);
        const oldAvg = num(existing[3]);
        const nextShares = oldShares + shares;
        const nextAvg = nextShares > 0
          ? ((oldShares * oldAvg) + (shares * avg)) / nextShares
          : avg;
        const existingCurrent = num(existing[1]);

        await writePosition(
          s,
          user.spreadsheet_id,
          ticker,
          market,
          nextShares,
          nextAvg,
          account,
          existingCurrent > 0 ? existingCurrent : undefined,
        );
      } else {
        await writePosition(s, user.spreadsheet_id, ticker, market, shares, avg, account);
      }

      return res.status(200).json({ success: true, mode });
    }

    if (req.method === "PUT") {
      const body = req.body || {};
      const ticker = display(body.ticker).toUpperCase();
      const market: "ID" | "US" = body.market === "US" ? "US" : "ID";
      const shares = Number(body.shares);
      const avg = Number(body.avgPrice);
      const account = display(body.account);

      if (!ticker || !TICKER_RE.test(ticker) || !Number.isFinite(shares) || shares <= 0 || !Number.isFinite(avg) || avg < 0 || !account) {
        return res.status(400).json({ error: "Ticker, quantity, harga beli, dan akun wajib diisi." });
      }

      const rs = await rows(s, user.spreadsheet_id);
      const found = findStockRow(rs, ticker, market);
      if (found.row < 0) return res.status(404).json({ error: "Saham tidak ditemukan" });

      const current = num(rs[found.row]?.[1]);
      await writePosition(
        s,
        user.spreadsheet_id,
        ticker,
        market,
        shares,
        avg,
        account,
        current > 0 ? current : undefined,
      );

      return res.status(200).json({ success: true });
    }

    if (req.method === "DELETE") {
      const body = req.body || {};
      const ticker = display(body.ticker).toUpperCase();
      const market: "ID" | "US" = body.market === "US" ? "US" : "ID";

      if (!ticker || !TICKER_RE.test(ticker)) {
        return res.status(400).json({ error: "Ticker dan market wajib diisi." });
      }

      await deletePosition(s, user.spreadsheet_id, ticker, market);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: "Method Not Allowed" });
  } catch (e) {
    const x = e as Error & { status?: number };
    return res.status(x.status || 500).json({ error: x.message || "Gagal memproses saham." });
  }
}
