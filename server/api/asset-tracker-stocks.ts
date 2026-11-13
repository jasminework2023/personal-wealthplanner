import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  deleteStockPosition,
  findStockRow,
  parseNumber,
  readStockPortfolio,
  writeStockPosition,
  type StockMarket,
} from "../lib/stockSheet.js";

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

async function price(ticker: string, market: StockMarket) {
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

function stockError(
  ticker: string,
  market: StockMarket,
  tab: string,
  rowsRead: number,
) {
  console.error("Stock operation: saham tidak ditemukan", {
    ticker,
    market,
    tab,
    rowsRead,
  });
  return Object.assign(
    new Error("Saham " + ticker + " tidak ditemukan di tab " + tab),
    { status: 404 },
  );
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const token = String(
    req.method === "GET" ? req.query.token || "" : req.body?.token || "",
  ).trim();
  if (!token) return res.status(400).json({ error: "Token tidak ditemukan" });

  try {
    const user = await auth(token);
    const sheets = sheetsClient();

    if (req.method === "GET") {
      let result = await readStockPortfolio(sheets, user.spreadsheet_id, {
        createIfMissing: false,
      });
      let holdings = result.holdings;
      let status = "";

      if (String(req.query.refresh || "") === "1") {
        for (const h of holdings) {
          try {
            await writeStockPosition(sheets, user.spreadsheet_id, {
              ticker: h.ticker,
              market: h.market,
              shares: h.shares,
              avgPrice: h.avgPrice,
              account: h.account,
              currentPrice: await price(h.ticker, h.market),
            });
          } catch {
            status = "Sebagian harga belum bisa diperbarui.";
          }
        }
        result = await readStockPortfolio(sheets, user.spreadsheet_id, {
          createIfMissing: false,
        });
        holdings = result.holdings;
      }

      const accounts = Array.from(
        new Map(
          holdings
            .filter((h) => h.account)
            .map((h) => [
              h.account.trim().toLowerCase(),
              {
                id: h.account.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"),
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
        priceStatus:
          status ||
          (String(req.query.refresh || "") === "1"
            ? "Harga diperbarui."
            : ""),
        sheet: result.sheet?.title || "",
      });
    }

    if (req.method === "POST") {
      const body = req.body || {};
      const ticker = String(body.ticker || "").trim().toUpperCase();
      const market: StockMarket = body.market === "US" ? "US" : "ID";
      const shares = Number(body.shares);
      const avgPrice = Number(body.avgPrice);
      const account = String(body.account || "").trim();
      const mode = body.mode === "buy" ? "buy" : "set";

      if (
        !ticker ||
        !Number.isFinite(shares) ||
        shares <= 0 ||
        !Number.isFinite(avgPrice) ||
        avgPrice < 0
      ) {
        return res
          .status(400)
          .json({ error: "Ticker, quantity, dan harga beli wajib diisi." });
      }
      if (!account) {
        return res
          .status(400)
          .json({ error: "Investment Account wajib dipilih." });
      }

      const result = await readStockPortfolio(sheets, user.spreadsheet_id, {
        createIfMissing: false,
      });
      const found = findStockRow(result.sheet?.rows || [], ticker, market);

      if (mode === "buy" && found.row >= 0) {
        const existing = result.sheet!.rows[found.row] || [];
        const oldShares = parseNumber(existing[found.columns.shares]);
        const oldAvg = parseNumber(existing[found.columns.avgPrice]);
        const nextShares = oldShares + shares;
        const nextAvg =
          nextShares > 0
            ? (oldShares * oldAvg + shares * avgPrice) / nextShares
            : avgPrice;
        const existingCurrent = parseNumber(
          existing[found.columns.currentPrice],
        );

        await writeStockPosition(sheets, user.spreadsheet_id, {
          ticker,
          market,
          shares: nextShares,
          avgPrice: nextAvg,
          account,
          currentPrice:
            existingCurrent > 0
              ? existingCurrent
              : await price(ticker, market),
        });
      } else {
        await writeStockPosition(sheets, user.spreadsheet_id, {
          ticker,
          market,
          shares,
          avgPrice,
          account,
          currentPrice: await price(ticker, market),
        });
      }

      return res.status(200).json({ success: true, mode });
    }

    if (req.method === "PUT") {
      const body = req.body || {};
      const ticker = String(body.ticker || "").trim().toUpperCase();
      const market: StockMarket = body.market === "US" ? "US" : "ID";
      const shares = Number(body.shares);
      const avgPrice = Number(body.avgPrice);
      const account = String(body.account || "").trim();

      if (
        !ticker ||
        !Number.isFinite(shares) ||
        shares <= 0 ||
        !Number.isFinite(avgPrice) ||
        avgPrice < 0 ||
        !account
      ) {
        return res.status(400).json({
          error: "Ticker, quantity, harga beli, dan akun wajib diisi.",
        });
      }

      const result = await readStockPortfolio(sheets, user.spreadsheet_id, {
        createIfMissing: false,
      });
      if (!result.sheet) {
        throw stockError(ticker, market, "tidak ditemukan", 0);
      }

      const found = findStockRow(result.sheet.rows, ticker, market);
      if (found.row < 0) {
        throw stockError(
          ticker,
          market,
          result.sheet.title,
          result.sheet.rows.length,
        );
      }

      const current = parseNumber(
        result.sheet.rows[found.row]?.[found.columns.currentPrice],
      );
      await writeStockPosition(sheets, user.spreadsheet_id, {
        ticker,
        market,
        shares,
        avgPrice,
        account,
        currentPrice: current > 0 ? current : await price(ticker, market),
      });

      return res.status(200).json({ success: true });
    }

    if (req.method === "DELETE") {
      const body = req.body || {};
      const ticker = String(body.ticker || "").trim().toUpperCase();
      const market: StockMarket = body.market === "US" ? "US" : "ID";

      if (!ticker) {
        return res
          .status(400)
          .json({ error: "Ticker dan market wajib diisi." });
      }

      await deleteStockPosition(
        sheets,
        user.spreadsheet_id,
        ticker,
        market,
      );
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: "Method Not Allowed" });
  } catch (e) {
    const x = e as Error & { status?: number };
    return res
      .status(x.status || 500)
      .json({ error: x.message || "Gagal memproses saham." });
  }
}
