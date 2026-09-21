import type { VercelRequest, VercelResponse } from "@vercel/node";

import h_access from "../server/api/access.ts";
import h_add_asset_item from "../server/api/add-asset-item.ts";
import h_add_budget_category from "../server/api/add-budget-category.ts";
import h_add_transaction from "../server/api/add-transaction.ts";
import h_connect_sheet from "../server/api/connect-sheet.ts";
import h_create_payment from "../server/api/create-payment.ts";
import h_create_wealth_tracker_payment from "../server/api/create-wealth-tracker-payment.ts";
import h_dashboard from "../server/api/dashboard.ts";
import h_delete_asset_item from "../server/api/delete-asset-item.ts";
import h_delete_transaction from "../server/api/delete-transaction.ts";
import h_receipt_ai from "../server/api/receipt-ai.ts";
import h_setup from "../server/api/setup.ts";
import h_update_asset_target from "../server/api/update-asset-target.ts";
import h_update_asset from "../server/api/update-asset.ts";
import h_update_budget from "../server/api/update-budget.ts";
import h_update_transaction from "../server/api/update-transaction.ts";
import h_wealth_tracker_payment from "../server/api/wealth-tracker-payment.ts";
import h_wealth_tracker_webhook from "../server/api/wealth-tracker-webhook.ts";
import h_xendit_webhook from "../server/api/xendit-webhook.ts";

const handlers: Record<string, (req: VercelRequest, res: VercelResponse) => unknown> = {
  access: h_access,
  "add-asset-item": h_add_asset_item,
  "add-budget-category": h_add_budget_category,
  "add-transaction": h_add_transaction,
  "connect-sheet": h_connect_sheet,
  "create-payment": h_create_payment,
  "create-wealth-tracker-payment": h_create_wealth_tracker_payment,
  dashboard: h_dashboard,
  "delete-asset-item": h_delete_asset_item,
  "delete-transaction": h_delete_transaction,
  "receipt-ai": h_receipt_ai,
  setup: h_setup,
  "update-asset-target": h_update_asset_target,
  "update-asset": h_update_asset,
  "update-budget": h_update_budget,
  "update-transaction": h_update_transaction,
  "wealth-tracker-payment": h_wealth_tracker_payment,
  "wealth-tracker-webhook": h_wealth_tracker_webhook,
  "xendit-webhook": h_xendit_webhook,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const rawRoute = req.query.route;
  const route = Array.isArray(rawRoute) ? rawRoute[0] : String(rawRoute || "");
  const target = handlers[route];

  if (!target) {
    return res.status(404).json({ error: `API route tidak ditemukan: ${route}` });
  }

  return target(req, res);
}
