import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomUUID } from "node:crypto";

const MAX_IMAGE_DATA_URL_BYTES = 3.5 * 1024 * 1024;
const ALLOWED_CATEGORIES = [
  "Food & Groceries",
  "Transport",
  "Utilities",
  "Shopping",
  "Entertainment",
  "Education",
  "Charity",
  "Insurance Premium",
  "Other",
] as const;

const SYSTEM_PROMPT =
  "You extract one transaction from a receipt image. Read only visible information. " +
  "Use the final payable/total amount when clearly visible. " +
  "If the receipt date is visible, return DD/MM/YYYY; otherwise return an empty string. " +
  "Type must be Expense. Choose category only from this list: " +
  ALLOWED_CATEGORIES.join(", ") +
  ". Never invent missing values. " +
  'Respond with ONLY a JSON object shaped exactly like: ' +
  '{"amount": number, "description": string, "date": string, "category": string, "type": "Expense"}. ' +
  "No markdown, no code fences, no extra text.";

function approxDataUrlBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(",");
  if (comma === -1) return 0;
  const base64 = dataUrl.slice(comma + 1).replace(/\s/g, "");
  return Math.ceil((base64.length * 3) / 4);
}

function extractOutputText(data: any): string {
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content === "string" && content.trim()) return content.trim();
  if (Array.isArray(content)) {
    return content.map((item: any) => item?.text || "").join("").trim();
  }
  return "";
}

function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}

// Model (terutama Groq json_object) kadang mengembalikan nominal sebagai string
// ("35.000" / "Rp 35.000,00"). Number("35.000") = 35, jadi harus dibersihkan dulu.
function parseAmount(raw: unknown): number {
  if (typeof raw === "number") return Math.round(raw);
  let s = String(raw ?? "").replace(/rp\.?/gi, "").replace(/\s/g, "");
  s = s.replace(/[.,]\d{1,2}$/, (m) => (/^[.,]\d{3}$/.test(m) ? m : "")); // buang desimal
  s = s.replace(/[^\d]/g, "");
  return s ? Number(s) : NaN;
}

// Terima DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, YYYY-MM-DD, dan tahun 2 digit.
// Hasil selalu "D/M/YYYY" (sama dengan toLocaleDateString("id-ID") di input manual),
// atau "" kalau tidak valid -> klien memakai tanggal hari ini / pilihan user.
function normalizeReceiptDate(raw: string): string {
  const s = raw.trim();
  if (!s) return "";
  let d: number, m: number, y: number;
  let match = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (match) {
    y = +match[1]; m = +match[2]; d = +match[3];
  } else {
    match = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
    if (!match) return "";
    d = +match[1]; m = +match[2]; y = +match[3];
    if (y < 100) y += 2000;
  }
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return "";
  return `${d}/${m}/${y}`;
}

function normalizeTransaction(value: any) {
  const amount = parseAmount(value?.amount);
  const description = String(value?.description || "").trim();
  const date = normalizeReceiptDate(String(value?.date || ""));
  const category = String(value?.category || "Other").trim();

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Nominal pada struk tidak terbaca dengan jelas.");
  }
  if (!description) {
    throw new Error("Nama/detail transaksi pada struk tidak terbaca.");
  }

  return {
    amount,
    description,
    date,
    category: (ALLOWED_CATEGORIES as readonly string[]).includes(category) ? category : "Other",
    type: "Expense",
  };
}

// Provider Groq dicoba lebih dulu (free tier). OpenAI dipakai kalau GROQ_API_KEY
// tidak diset, atau sebagai cadangan kalau permintaan ke Groq gagal karena error
// server (5xx) atau model sedang penuh (429).
function resolveProvider(preferred?: "groq" | "openai") {
  const groqKey = process.env.GROQ_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  const order: Array<"groq" | "openai"> =
    preferred === "openai" ? ["openai", "groq"] : ["groq", "openai"];

  const providers: Array<{ name: "groq" | "openai"; key: string; endpoint: string; model: string }> = [];
  for (const name of order) {
    if (name === "groq" && groqKey) {
      providers.push({
        name: "groq",
        key: groqKey,
        endpoint: "https://api.groq.com/openai/v1/chat/completions",
        model: process.env.GROQ_RECEIPT_MODEL || "qwen/qwen3.8-27b",
      });
    }
    if (name === "openai" && openaiKey) {
      providers.push({
        name: "openai",
        key: openaiKey,
        endpoint: "https://api.openai.com/v1/chat/completions",
        model: process.env.OPENAI_RECEIPT_MODEL || "gpt-4.1-mini",
      });
    }
  }
  return providers;
}

async function callProvider(
  provider: { name: "groq" | "openai"; key: string; endpoint: string; model: string },
  image: string,
) {
  const body: any = {
    model: provider.model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          { type: "text", text: "Extract the transaction from this receipt and return the structured fields." },
          { type: "image_url", image_url: { url: image, detail: "high" } },
        ],
      },
    ],
    temperature: 0,
    max_tokens: 300,
  };

  // OpenAI mendukung structured output strict (json_schema). Groq dipakai dengan
  // json_object biasa + instruksi format di system prompt di atas, karena strict
  // json_schema belum konsisten didukung semua model vision Groq.
  if (provider.name === "openai") {
    body.response_format = {
      type: "json_schema",
      json_schema: {
        name: "receipt_transaction",
        strict: true,
        schema: {
          type: "object",
          properties: {
            amount: { type: "number" },
            description: { type: "string" },
            date: { type: "string" },
            category: { type: "string", enum: [...ALLOWED_CATEGORIES] },
            type: { type: "string", enum: ["Expense"] },
          },
          required: ["amount", "description", "date", "category", "type"],
          additionalProperties: false,
        },
      },
    };
  } else {
    body.response_format = { type: "json_object" };
  }

  const response = await fetch(provider.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${provider.key}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(45_000),
  });

  const data = await response.json().catch(() => ({}));
  return { response, data };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // Receipt processing is a paid-resource endpoint. Require the same dashboard
  // token used by the rest of the app and verify it server-side before calling an AI provider.
  const token = typeof req.body?.token === "string" ? req.body.token.trim() : "";
  if (!token || token.length > 512) {
    return res.status(401).json({ error: "Sesi tidak valid. Muat ulang dashboard lalu coba lagi." });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("receipt-ai: Supabase server credentials are not configured");
    return res.status(503).json({ error: "Layanan AI struk sedang belum tersedia." });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: user, error: authError } = await supabase
    .from("users")
    .select("user_id, username, is_active")
    .eq("dashboard_token", token)
    .single();

  if (authError) {
    console.error("receipt-ai auth lookup failed:", authError.message);
    return res.status(401).json({ error: "Sesi tidak valid. Muat ulang dashboard lalu coba lagi." });
  }
  if (!user) {
    return res.status(401).json({ error: "Sesi tidak valid. Muat ulang dashboard lalu coba lagi." });
  }
  if (!user.is_active) {
    return res.status(403).json({ error: "Akun belum aktif." });
  }
  const authenticatedUserId = user.user_id;
  const authenticatedUsername = user.username;

  const providers = resolveProvider(req.body?.provider === "openai" ? "openai" : undefined);
  if (providers.length === 0) {
    return res.status(503).json({
      error:
        "Fitur AI struk belum aktif. Tambahkan GROQ_API_KEY (gratis, direkomendasikan) " +
        "atau OPENAI_API_KEY di Environment Variables Vercel.",
    });
  }

  const image = req.body?.image;
  if (typeof image !== "string" || !image.startsWith("data:image/")) {
    return res.status(400).json({ error: "Foto struk belum dipilih atau formatnya tidak didukung." });
  }

  if (approxDataUrlBytes(image) > MAX_IMAGE_DATA_URL_BYTES) {
    return res.status(413).json({
      error: "Foto masih terlalu besar. Coba foto ulang dengan jarak lebih dekat atau gunakan gambar yang lebih kecil.",
    });
  }

  // Atomic database-backed fixed-window limit: default 5 requests per active account per minute.
  // The RPC is intentionally server-only; if its migration has not been applied, fail closed.
  const windowSeconds = Number(process.env.AI_RECEIPT_RATE_WINDOW_SECONDS) || 60;
  const maxRequests = Number(process.env.AI_RECEIPT_RATE_MAX_REQUESTS) || 5;
  const { data: rateRows, error: rateError } = await supabase.rpc("consume_ai_rate_limit", {
    p_username: authenticatedUsername,
    p_window_seconds: windowSeconds,
    p_max_requests: maxRequests,
  });

  if (rateError || !Array.isArray(rateRows) || !rateRows[0]) {
    console.error("receipt-ai rate limit check failed:", rateError?.message || "No RPC result");
    return res.status(503).json({ error: "Layanan AI sedang disiapkan. Silakan coba beberapa saat lagi." });
  }

  if (!rateRows[0].allowed) {
    const retryAfter = Math.max(1, Number(rateRows[0].retry_after_seconds) || windowSeconds);
    res.setHeader("Retry-After", String(retryAfter));
    return res.status(429).json({
      error: "Batas penggunaan AI struk sementara tercapai. Coba lagi sebentar.",
      retryAfterSeconds: retryAfter,
    });
  }

  // Reserve 2 credits atomically. They are committed only after valid structured
  // transaction data is returned; provider failures release the reservation.
  const requestId = randomUUID();
  const { data: creditRows, error: creditError } = await supabase.rpc("reserve_ai_credits", {
    p_user_id: authenticatedUserId,
    p_request_id: requestId,
    p_feature: "receipt_scan",
    p_credits: 2,
  });

  if (creditError || !Array.isArray(creditRows) || !creditRows[0]) {
    console.error("receipt-ai credit reservation failed:", creditError?.message || "No RPC result");
    return res.status(503).json({ error: "Kuota AI belum dapat diverifikasi. Silakan coba lagi." });
  }
  if (!creditRows[0].allowed) {
    const reason = String(creditRows[0].reason || "");
    const status = reason === "ai_access_expired" || reason === "user_not_found" ? 403
      : reason === "insufficient_credits" ? 402 : 409;
    return res.status(status).json({
      error: reason === "ai_access_expired"
        ? "Masa akses AI kamu sudah berakhir. Perpanjang AI PRO+ untuk melanjutkan."
        : reason === "insufficient_credits"
          ? "Kredit AI kamu tidak mencukupi untuk scan struk."
          : "Akses AI belum dapat digunakan. Coba lagi beberapa saat.",
      reason,
      creditsRemaining: Number(creditRows[0].credits_remaining) || 0,
    });
  }

  async function settleCredit(success: boolean) {
    const { data, error } = await supabase.rpc("settle_ai_credit", {
      p_user_id: user.user_id,
      p_request_id: requestId,
      p_success: success,
    });
    if (error || !Array.isArray(data) || !data[0]) {
      throw new Error(error?.message || "Gagal menyelesaikan pencatatan kredit AI.");
    }
    return data[0];
  }

  let lastError: { status: number; message: string } | null = null;

  for (const provider of providers) {
    try {
      const { response, data } = await callProvider(provider, image);

      if (!response.ok) {
        const providerMessage =
          data?.error?.message || data?.message || `${provider.name} mengembalikan HTTP ${response.status}.`;
        console.error(`receipt-ai ${provider.name} error:`, providerMessage);
        lastError = { status: response.status >= 500 ? 502 : 400, message: `AI struk gagal (${provider.name}): ${providerMessage}` };
        // Coba provider berikutnya hanya kalau ini masalah server/kuota, bukan input yang salah.
        if (response.status >= 500 || response.status === 429) continue;
        try { await settleCredit(false); } catch (settleError) {
          console.error("receipt-ai credit refund failed:", settleError);
          return res.status(503).json({ error: "Permintaan gagal dan pengembalian kredit sedang diproses." });
        }
        return res.status(lastError.status).json({ error: lastError.message });
      }

      if (data?.status === "incomplete") {
        lastError = { status: 502, message: "AI belum selesai membaca struk. Coba foto yang lebih jelas." };
        continue;
      }

      const rawText = extractOutputText(data);
      if (!rawText) {
        lastError = { status: 502, message: "AI tidak menghasilkan data transaksi. Coba foto ulang." };
        continue;
      }

      let parsed: any;
      try {
        parsed = JSON.parse(stripCodeFence(rawText));
      } catch {
        console.error(`receipt-ai invalid structured output (${provider.name}):`, rawText.slice(0, 500));
        lastError = { status: 502, message: "Hasil AI tidak dapat dibaca. Coba foto struk yang lebih jelas." };
        continue;
      }

      const transaction = normalizeTransaction(parsed);
      try {
        const settlement = await settleCredit(true);
        return res.status(200).json({
          success: true,
          transaction,
          provider: provider.name,
          creditsRemaining: Number(settlement.credits_remaining) || 0,
        });
      } catch (settleError) {
        console.error("receipt-ai credit commit failed:", settleError);
        return res.status(503).json({ error: "Hasil AI sudah diproses, tetapi status kredit belum tersimpan. Hubungi support sebelum mengulang scan." });
      }
    } catch (error) {
      console.error(`receipt-ai ${provider.name} error:`, error);
      if (error instanceof Error && error.name === "TimeoutError") {
        lastError = { status: 504, message: "AI terlalu lama membaca struk. Coba lagi." };
        continue;
      }
      lastError = { status: 500, message: error instanceof Error ? error.message : "Gagal membaca struk" };
      continue;
    }
  }

  try { await settleCredit(false); } catch (settleError) {
    console.error("receipt-ai final credit refund failed:", settleError);
    return res.status(503).json({ error: "Permintaan gagal dan pengembalian kredit sedang diproses." });
  }
  return res.status(lastError?.status || 500).json({ error: lastError?.message || "Gagal membaca struk" });
}
