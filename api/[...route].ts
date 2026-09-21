import type { VercelRequest, VercelResponse } from "@vercel/node";
import h_access from "../server/api/access";
import h_add_asset_item from "../server/api/add-asset-item";
import h_add_budget_category from "../server/api/add-budget-category";
import h_add_transaction from "../server/api/add-transaction";
import h_connect_sheet from "../server/api/connect-sheet";
import h_create_payment from "../server/api/create-payment";
import h_create_wealth_tracker_payment from "../server/api/create-wealth-tracker-payment";
import h_dashboard from "../server/api/dashboard";
import h_delete_asset_item from "../server/api/delete-asset-item";
import h_delete_transaction from "../server/api/delete-transaction";
import h_receipt_ai from "../server/api/receipt-ai";
import h_setup from "../server/api/setup";
import h_update_asset_target from "../server/api/update-asset-target";
import h_update_asset from "../server/api/update-asset";
import h_update_budget from "../server/api/update-budget";
import h_update_transaction from "../server/api/update-transaction";
import h_wealth_tracker_payment from "../server/api/wealth-tracker-payment";
import h_wealth_tracker_webhook from "../server/api/wealth-tracker-webhook";
import h_xendit_webhook from "../server/api/xendit-webhook";

const handlers: Record<string, (req: VercelRequest, res: VercelResponse) => unknown> = {
  "access": h_access,
  "add-asset-item": h_add_asset_item,
  "add-budget-category": h_add_budget_category,
  "add-transaction": h_add_transaction,
  "connect-sheet": h_connect_sheet,
  "create-payment": h_create_payment,
  "create-wealth-tracker-payment": h_create_wealth_tracker_payment,
  "dashboard": h_dashboard,
  "delete-asset-item": h_delete_asset_item,
  "delete-transaction": h_delete_transaction,
  "receipt-ai": h_receipt_ai,
  "setup": h_setup,
  "update-asset-target": h_update_asset_target,
  "update-asset": h_update_asset,
  "update-budget": h_update_budget,
  "update-transaction": h_update_transaction,
  "wealth-tracker-payment": h_wealth_tracker_payment,
  "wealth-tracker-webhook": h_wealth_tracker_webhook,
  "xendit-webhook": h_xendit_webhook,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const rawUrl = req.url || "";
  const pathname = rawUrl.split("?")[0];
  const parts = pathname.split("/").filter(Boolean);
  const route = parts[0] === "api" ? parts[1] : undefined;

  if (!route || !handlers[route]) {
    return res.status(404).json({ error: "API route not found" });
  }

  return handlers[route](req, res);
};
