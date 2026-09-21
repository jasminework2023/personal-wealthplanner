import type { VercelRequest, VercelResponse } from "@vercel/node";

import access from "../server/api/access";
import addAssetItem from "../server/api/add-asset-item";
import addBudgetCategory from "../server/api/add-budget-category";
import addTransaction from "../server/api/add-transaction";
import connectSheet from "../server/api/connect-sheet";
import createPayment from "../server/api/create-payment";
import createWealthTrackerPayment from "../server/api/create-wealth-tracker-payment";
import dashboard from "../server/api/dashboard";
import deleteAssetItem from "../server/api/delete-asset-item";
import deleteTransaction from "../server/api/delete-transaction";
import receiptAi from "../server/api/receipt-ai";
import setup from "../server/api/setup";
import updateAsset from "../server/api/update-asset";
import updateAssetTarget from "../server/api/update-asset-target";
import updateBudget from "../server/api/update-budget";
import updateTransaction from "../server/api/update-transaction";
import wealthTrackerPayment from "../server/api/wealth-tracker-payment";
import wealthTrackerWebhook from "../server/api/wealth-tracker-webhook";
import xenditWebhook from "../server/api/xendit-webhook";

type Handler = (req: VercelRequest, res: VercelResponse) => unknown;

const handlers: Record<string, Handler> = {
  access,
  "add-asset-item": addAssetItem,
  "add-budget-category": addBudgetCategory,
  "add-transaction": addTransaction,
  "connect-sheet": connectSheet,
  "create-payment": createPayment,
  "create-wealth-tracker-payment": createWealthTrackerPayment,
  dashboard,
  "delete-asset-item": deleteAssetItem,
  "delete-transaction": deleteTransaction,
  "receipt-ai": receiptAi,
  setup,
  "update-asset": updateAsset,
  "update-asset-target": updateAssetTarget,
  "update-budget": updateBudget,
  "update-transaction": updateTransaction,
  "wealth-tracker-payment": wealthTrackerPayment,
  "wealth-tracker-webhook": wealthTrackerWebhook,
  "xendit-webhook": xenditWebhook,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const rawRoute = req.query.route;
  const route = Array.isArray(rawRoute) ? rawRoute.join("/") : String(rawRoute || "");
  const cleanRoute = route.replace(/^\/+|\/+$/g, "").split("/")[0];
  const target = handlers[cleanRoute];

  if (!target) {
    return res.status(404).json({ error: "API route tidak ditemukan." });
  }

  return target(req, res);
}
