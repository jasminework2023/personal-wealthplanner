import type { VercelRequest, VercelResponse } from "@vercel/node";
import handler from "../server/api/wallets.js";

// Explicit endpoint avoids relying on the catch-all route for /api/wallets.
export default async function wallets(req: VercelRequest, res: VercelResponse) {
  return await handler(req, res);
}
