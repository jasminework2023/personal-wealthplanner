import type { VercelRequest, VercelResponse } from "@vercel/node";

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
      return res.status(200).json({ success: true, transaction, provider: provider.name });
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

  return res.status(lastError?.status || 500).json({ error: lastError?.message || "Gagal membaca struk" });
}
