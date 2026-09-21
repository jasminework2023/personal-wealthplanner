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

function approxDataUrlBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(",");
  if (comma === -1) return 0;
  const base64 = dataUrl.slice(comma + 1).replace(/\s/g, "");
  return Math.ceil(base64.length * 3 / 4);
}

function extractOutputText(data: any): string {
  if (typeof data?.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  return (data?.output || [])
    .flatMap((item: any) => item?.content || [])
    .map((content: any) => content?.text || "")
    .join("")
    .trim();
}

function normalizeTransaction(value: any) {
  const amount = Number(value?.amount);
  const description = String(value?.description || "").trim();
  const date = String(value?.date || "").trim();
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return res.status(503).json({
      error: "Fitur AI struk belum aktif. Tambahkan OPENAI_API_KEY di Environment Variables Vercel.",
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

  try {
    const model = process.env.OPENAI_RECEIPT_MODEL || "gpt-4.1-mini";

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text:
                  "Extract the transaction from this receipt. Read only what is visible. " +
                  "Use the final payable/total amount when clearly visible. " +
                  "If the receipt date is visible, return it as DD/MM/YYYY; otherwise return an empty string. " +
                  "Return type as Expense. Choose category only from the provided enum. " +
                  "Do not invent missing values.",
              },
              {
                type: "input_image",
                image_url: image,
                detail: "high",
              },
            ],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "receipt_transaction",
            strict: true,
            schema: {
              type: "object",
              properties: {
                amount: { type: "number" },
                description: { type: "string" },
                date: { type: "string" },
                category: {
                  type: "string",
                  enum: [...ALLOWED_CATEGORIES],
                },
                type: {
                  type: "string",
                  enum: ["Expense"],
                },
              },
              required: ["amount", "description", "date", "category", "type"],
              additionalProperties: false,
            },
          },
        },
      }),
      signal: AbortSignal.timeout(45_000),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const providerMessage =
        data?.error?.message ||
        data?.message ||
        `OpenAI mengembalikan HTTP ${response.status}.`;
      console.error("receipt-ai OpenAI error:", providerMessage);
      return res.status(response.status >= 500 ? 502 : 400).json({
        error: `AI struk gagal: ${providerMessage}`,
      });
    }

    if (data?.status === "incomplete") {
      return res.status(502).json({ error: "AI belum selesai membaca struk. Coba foto yang lebih jelas." });
    }

    const text = extractOutputText(data);
    if (!text) {
      return res.status(502).json({ error: "AI tidak menghasilkan data transaksi. Coba foto ulang." });
    }

    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      console.error("receipt-ai invalid structured output:", text.slice(0, 500));
      return res.status(502).json({ error: "Hasil AI tidak dapat dibaca. Coba foto struk yang lebih jelas." });
    }

    const transaction = normalizeTransaction(parsed);
    return res.status(200).json({ success: true, transaction });
  } catch (error) {
    console.error("receipt-ai error:", error);
    if (error instanceof Error && error.name === "TimeoutError") {
      return res.status(504).json({ error: "AI terlalu lama membaca struk. Coba lagi." });
    }
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Gagal membaca struk",
    });
  }
}
