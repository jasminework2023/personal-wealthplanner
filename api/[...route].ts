import type { VercelRequest, VercelResponse } from "@vercel/node";

import h_access from "../server/api/access.js";
import h_add_asset_item from "../server/api/add-asset-item.js";
import h_add_budget_category from "../server/api/add-budget-category.js";
import h_add_transaction from "../server/api/add-transaction.js";
import h_connect_sheet from "../server/api/connect-sheet.js";
import h_create_payment from "../server/api/create-payment.js";
import h_create_wealth_tracker_payment from "../server/api/create-wealth-tracker-payment.js";
import h_dashboard from "../server/api/dashboard.js";
import h_delete_asset_item from "../server/api/delete-asset-item.js";
import h_delete_transaction from "../server/api/delete-transaction.js";
import h_receipt_ai from "../server/api/receipt-ai.js";
import h_setup from "../server/api/setup.js";
import h_update_asset_target from "../server/api/update-asset-target.js";
import h_update_asset from "../server/api/update-asset.js";
import h_update_budget from "../server/api/update-budget.js";
import h_update_transaction from "../server/api/update-transaction.js";
import h_wealth_tracker_payment from "../server/api/wealth-tracker-payment.js";
import h_wealth_tracker_webhook from "../server/api/wealth-tracker-webhook.js";
import h_xendit_webhook from "../server/api/xendit-webhook.js";

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
  // Vercel catch-all params are normally available as req.query.route.
  // Keep a pathname fallback so this remains robust if the runtime supplies
  // the route parameter in a different shape.
  const routeParam = req.query.route;
  let route = Array.isArray(routeParam) ? routeParam.join("/") : String(routeParam || "");

  if (!route) {
    const pathname = new URL(req.url || "/", "http://localhost").pathname;
    route = pathname.replace(/^\/api\/?/, "").replace(/\/$/, "");
  }

  const name = route.split("/").filter(Boolean)[0] || "";
  const target = handlers[name];

  if (!target) {
    return res.status(404).json({ error: `API route tidak ditemukan: /api/${route}` });
  }

  return await target(req, res);
}
