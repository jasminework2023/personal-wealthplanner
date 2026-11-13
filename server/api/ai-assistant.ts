import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";
import { randomUUID } from "node:crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";

function getDb() {
  return createClient(process.env.SUPABASE_URL as string, process.env.SUPABASE_SERVICE_ROLE_KEY as string);
}
function parseRupiah(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  let cleaned = String(value).replace(/Rp/gi, "").replace(/IDR/gi, "").replace(/\\$/g, "").replace(/\\s/g, "").trim();
  if (!cleaned) return 0;
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  if (lastComma !== -1 && lastDot !== -1) {
    cleaned = lastComma > lastDot ? cleaned.replace(/\\./g, "").replace(",", ".") : cleaned.replace(/,/g, "");
  } else if (lastComma !== -1) {
    cleaned = cleaned.length - lastComma - 1 === 3 ? cleaned.replace(/,/g, "") : cleaned.replace(",", ".");
  } else if (lastDot !== -1) {
    cleaned = cleaned.length - lastDot - 1 === 3 ? cleaned.replace(/\\./g, "") : cleaned;
  }
  const n = Number(cleaned.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

const MONTHS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

function normalizeDate(value: unknown, monthValue: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const iso = raw.match(/^(\\d{4})-(\\d{1,2})-(\\d{1,2})/);
  if (iso) return `${iso[1]}-${String(Number(iso[2])).padStart(2, "0")}-${String(Number(iso[3])).padStart(2, "0")}`;
  const parts = raw.match(/^(\\d{1,2})[\\/. -](\\d{1,2})[\\/. -](\\d{2,4})$/);
  if (parts) {
    const first = Number(parts[1]), second = Number(parts[2]);
    let year = Number(parts[3]), day = first, month = second;
    const expectedMonth = MONTHS[String(monthValue ?? "").trim().toLowerCase()];
    if (expectedMonth && first === expectedMonth && second !== expectedMonth) { month = first; day = second; }
    else if (expectedMonth && second === expectedMonth && first !== expectedMonth) { day = first; month = second; }
    else if (first <= 12 && second > 12) { day = second; month = first; }
    if (year < 100) year += year < 50 ? 2000 : 1900;
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

function parseSetupExpenseCategories(rows: unknown[][]): string[] {
  const result: string[] = [];
  for (let r = 0; r < rows.length; r++) {
    const category = String(rows[r]?.[3] ?? "").trim(); // Setup E column in B:L range
    const status = String(rows[r]?.[4] ?? "").trim().toLowerCase();
    if (!category || category.toLowerCase() === "category") continue;
    if (category.toLowerCase() === "total") break;
    if (["true", "yes", "1", "active", "aktif", "checked", "✓"].includes(status)) result.push(category);
  }
  return result;
}

function getBudgetByMonth(rows: unknown[][], expenseCategories: string[]) {
  const normalizedExpense = new Set(expenseCategories.map((x) => x.trim().replace(/\\s+/g, " ").toLowerCase()));
  const result: Record<string, number> = {};
  for (const row of rows) {
    for (let col = 0; col < row.length; col++) {
      const month = String(row[col] || "").trim().toLowerCase();
      if (!MONTHS[month]) continue;
      let total = 0;
      for (let i = rows.indexOf(row) + 1; i < rows.length; i++) {
        const label = String(rows[i]?.[0] || "").trim().replace(/\\s+/g, " ").toLowerCase();
        if (!label) continue;
        if (normalizedExpense.has(label)) total += parseRupiah(rows[i]?.[col]);
      }
      result[month] = total;
    }
  }
  return result;
}

async function getFinanceContext(spreadsheetId: string) {
  const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS as string);
  const auth = new google.auth.JWT({ email: credentials.client_email, key: credentials.private_key, scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"] });
  const sheets = google.sheets({ version: "v4", auth });
  const result = await sheets.spreadsheets.values.batchGet({
    spreadsheetId,
    ranges: ["Transaction!B10:I", "Asset Tracker!A1:O500", "Budgeting!B1:N40", "Setup!B1:L200"],
    valueRenderOption: "FORMATTED_VALUE",
  });
  const [tx = [], assets = [], budget = [], setup = []] = (result.data.valueRanges || []).map((r) => r.values || []);
  const expenseCategories = parseSetupExpenseCategories(setup);
  const budgetByMonth = getBudgetByMonth(budget, expenseCategories);
  const transactions = tx.map((r) => {
    const date = normalizeDate(r[0], r[1]);
    return {
      date, month: String(r[1] || ""), year: date ? Number(date.slice(0, 4)) : undefined,
      type: String(r[2] || ""), category: String(r[3] || ""), description: String(r[4] || ""),
      amount: parseRupiah(r[5]), wallet: String(r[6] || ""),
    };
  }).filter((t) => t.type && t.amount >= 0);

  const now = new Date();
  const currentMonth = now.toLocaleString("en-US", { month: "long" }).toLowerCase();
  const currentYear = now.getFullYear();
  const currentTx = transactions.filter((t) =>
    String(t.month).trim().toLowerCase() === currentMonth &&
    (!t.year || t.year === currentYear)
  );
  const currentExpense = currentTx.filter((t) => t.type.toLowerCase() === "expense").reduce((s, t) => s + t.amount, 0);
  const currentIncome = currentTx.filter((t) => t.type.toLowerCase() === "income").reduce((s, t) => s + t.amount, 0);
  const currentSaving = currentTx.filter((t) => t.type.toLowerCase() === "saving").reduce((s, t) => s + t.amount, 0);
  const currentBudget = Number(budgetByMonth[currentMonth] || 0);

  const monthlySummary: Record<string, any> = {};
  for (const month of Object.keys(MONTHS)) {
    const monthTx = transactions.filter((t) => String(t.month).trim().toLowerCase() === month && (!t.year || t.year === currentYear));
    const expense = monthTx.filter((t) => t.type.toLowerCase() === "expense").reduce((s, t) => s + t.amount, 0);
    const income = monthTx.filter((t) => t.type.toLowerCase() === "income").reduce((s, t) => s + t.amount, 0);
    const saving = monthTx.filter((t) => t.type.toLowerCase() === "saving").reduce((s, t) => s + t.amount, 0);
    const budget = Number(budgetByMonth[month] || 0);
    if (budget || expense || income || saving) {
      monthlySummary[month] = { budgetPengeluaran: budget, realisasiPengeluaran: expense, sisaAnggaran: budget - expense, pemasukan: income, tabungan: saving };
    }
  }

  return {
    recentTransactions: transactions.slice(-35),
    assetTracker: assets.slice(0, 45),
    budget,
    dashboardSummary: {
      month: currentMonth,
      year: currentYear,
      budgetPengeluaran: currentBudget,
      realisasiPengeluaran: currentExpense,
      sisaAnggaran: currentBudget - currentExpense,
      pemasukan: currentIncome,
      tabungan: currentSaving,
    },
    monthlySummary,
  };
}
export default async function handler(req: VercelRequest, res: VercelResponse) {
  let stage = "request";
  const token = String(req.method === "GET" ? req.query.token || "" : req.body?.token || "").trim();
  if (!token) return res.status(400).json({ error: "Token tidak ditemukan." });
  try {
    stage = "database";
    const db = getDb();
    const { data: user, error } = await db.from("users").select("user_id, username, spreadsheet_id, is_active, ai_trial_expires_at, ai_membership_expires_at").eq("dashboard_token", token).single();
    const currentUser = user as NonNullable<typeof user>;
    if (error || !currentUser || !currentUser.is_active || !currentUser.spreadsheet_id) return res.status(403).json({ error: "Akses dashboard tidak valid atau belum aktif." });

    // AI is available only while the user's trial or paid AI PRO+ access is active.
    // The server is the source of truth so a client cannot bypass membership by
    // calling this endpoint directly.
    const now = Date.now();
    const trialActive = currentUser.ai_trial_expires_at ? Date.parse(currentUser.ai_trial_expires_at) > now : false;
    const membershipActive = currentUser.ai_membership_expires_at ? Date.parse(currentUser.ai_membership_expires_at) > now : false;
    if (!trialActive && !membershipActive) {
      return res.status(403).json({ error: "Akses AI PRO+ kamu belum aktif atau sudah berakhir. Aktifkan membership untuk melanjutkan." });
    }

    if (req.method === "GET") {
      const requestedConversation = String(req.query.conversationId || "").trim();
      if (requestedConversation) {
        const { data: owned } = await db.from("ai_conversations").select("id").eq("id", requestedConversation).eq("user_id", String(currentUser.user_id)).single();
        if (!owned) return res.status(404).json({ error: "Percakapan tidak ditemukan." });
        const { data: messages, error: messageError } = await db.from("ai_messages").select("id,role,content,created_at").eq("conversation_id", requestedConversation).eq("user_id", String(currentUser.user_id)).order("created_at", { ascending: true }).limit(100);
        if (messageError) throw messageError;
        return res.status(200).json({ messages: messages || [] });
      }
      const { data, error: listError } = await db.from("ai_conversations").select("id,title,created_at,updated_at").eq("user_id", String(currentUser.user_id)).order("updated_at", { ascending: false }).limit(30);
      if (listError) throw listError;
      return res.status(200).json({ conversations: data || [] });
    }
    if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });
    const message = String(req.body?.message || "").trim().slice(0, 4000);
    let conversationId = String(req.body?.conversationId || "").trim();
    if (!message) return res.status(400).json({ error: "Tulis pertanyaan terlebih dahulu." });
    let conversation: any;
    if (conversationId) {
      const { data, error: convError } = await db.from("ai_conversations").select("id,title").eq("id", conversationId).eq("user_id", String(currentUser.user_id)).single();
      if (convError || !data) return res.status(404).json({ error: "Percakapan tidak ditemukan." });
      conversation = data;
    } else {
      const { data, error: convError } = await db.from("ai_conversations").insert({ user_id: String(currentUser.user_id), title: message.slice(0, sixty()) }).select("id,title").single();
      if (convError || !data) throw convError || new Error("Gagal membuat percakapan.");
      conversation = data; conversationId = data.id;
    }
    stage = "conversation_history";
    const { data: previous, error: historyError } = await db.from("ai_messages").select("role,content").eq("conversation_id", conversationId).eq("user_id", String(currentUser.user_id)).order("created_at", { ascending: false }).limit(12);
    if (historyError) throw historyError;
    stage = "google_sheets";
    const finance = await getFinanceContext(currentUser.spreadsheet_id);
    const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;
    const endpoint = process.env.GROQ_API_KEY ? "https://api.groq.com/openai/v1/chat/completions" : "https://api.openai.com/v1/chat/completions";
    const model = process.env.GROQ_API_KEY ? (process.env.GROQ_CHAT_MODEL || "openai/gpt-oss-20b") : (process.env.OPENAI_CHAT_MODEL || "gpt-4.1-mini");
    if (!apiKey) return res.status(503).json({ error: "AI belum dikonfigurasi. Hubungi administrator." });
    const history = (previous || []).reverse().map((m: any) => ({ role: m.role, content: m.content }));

    // One successful AI Assistant request = one AI PRO+ credit.
    // Reserve the credit server-side before calling the provider, then commit it
    // only after a valid AI answer is returned. Provider failures are refunded.
    const requestId = randomUUID();
    const { data: creditRows, error: creditError } = await db.rpc("reserve_ai_credits", {
      p_user_id: String(currentUser.user_id),
      p_request_id: requestId,
      p_feature: "ai_assistant",
      p_credits: 1,
    });
    if (creditError || !Array.isArray(creditRows) || !creditRows[0]) {
      console.error("ai-assistant credit reservation failed:", creditError?.message || "No RPC result");
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
            ? "Kredit AI kamu habis. Kredit akan diperbarui setiap 30 hari."
            : "Akses AI belum dapat digunakan. Coba lagi beberapa saat.",
        reason,
        creditsRemaining: Number(creditRows[0].credits_remaining) || 0,
      });
    }

    async function settleCredit(success: boolean) {
      const { data, error } = await db.rpc("settle_ai_credit", {
        p_user_id: String(currentUser.user_id),
        p_request_id: requestId,
        p_success: success,
      });
      if (error || !Array.isArray(data) || !data[0]) {
        throw new Error(error?.message || "Gagal menyelesaikan pencatatan kredit AI.");
      }
      return data[0];
    }

    stage = "groq_request";
    const completion = await fetch(endpoint, { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ model, temperature: 1, max_completion_tokens: 2400, messages: [{ role: "system", content: `Kamu adalah Wealthplanner AI, teman diskusi perencanaan keuangan pribadi yang ramah, hangat, ringkas, dan tidak menghakimi. Jawab dalam bahasa Indonesia. PENTING: jawab langsung sesuai pertanyaan, idealnya 80-140 kata dan maksimal 180 kata kecuali pengguna meminta perhitungan/penjelasan rinci. Jangan memberi kuliah atau panduan panjang sekaligus. Untuk konsultasi tujuan (pendidikan, rumah, pensiun, haji, warisan), pandu bertahap: jelaskan inti dalam 1-2 kalimat lalu ajukan HANYA SATU pertanyaan paling penting untuk langkah berikutnya. Gunakan paragraf pendek dan maksimal 3-5 bullet jika perlu. Jangan gunakan tabel Markdown, heading berulang, garis pemisah, atau menampilkan simbol Markdown mentah. Gunakan bold seperlunya. Jangan mengulang pertanyaan pengguna. ATURAN SUMBER DATA: satu-satunya sumber fakta keuangan pribadi pengguna adalah DATA KEUANGAN TERHUBUNG yang disisipkan di bawah instruksi ini, yang diambil dari spreadsheet_id milik akun yang token dashboard-nya sudah divalidasi. Jangan memakai contoh, asumsi, atau data pengguna lain sebagai fakta pengguna ini. Jangan mengarang saldo, pendapatan, pengeluaran, aset, utang, kategori, target, tanggal, atau tren. Jangan menyimpulkan data kosong sebagai nilai nol. JIKA JAWABAN SUDAH ADA SEBAGAI NILAI DI DATA TERHUBUNG, WAJIB AMBIL NILAI TERSEBUT LANGSUNG DAN JANGAN MENGHITUNG ULANG. Contoh: jika ada sisaAnggaran/sisaAnggaran yang sudah dihitung sistem, gunakan angka itu persis. Jangan mengganti dengan hasil perhitunganmu sendiri. Hanya lakukan kalkulasi jika nilai yang diminta memang tidak tersedia langsung dan angka pembentuknya tersedia. Jika informasi tidak ada, tidak lengkap, ambigu, atau periode datanya tidak jelas, katakan terus terang dalam satu kalimat lalu ajukan SATU pertanyaan untuk melengkapi data. Jika pengguna meminta opini, analisis, atau rekomendasi, kamu boleh menganalisis berdasarkan data terhubung, tetapi bedakan jelas fakta dari opini. Saat menyebut angka, pastikan angka itu benar-benar muncul di data terhubung atau hasil hitung transparan dari angka tersebut; sebutkan periode jika tersedia. Bedakan transaksi, aset, anggaran, dan target; jangan menganggap anggaran sebagai pengeluaran aktual atau aset sebagai saldo kas. Jika pengguna bertanya tentang sesuatu yang belum tercatat di dashboard (misalnya dana pendidikan), jangan berpura-pura target itu sudah tersimpan; bantu mulai dengan menanyakan satu informasi paling penting. Jika pertanyaan tidak membutuhkan data pribadi, jawab secara umum dan jangan mengklaim sedang membaca dashboard. Berikan edukasi, bukan janji hasil investasi atau rekomendasi investasi personal. Nama pengguna: ${currentUser.username || "Pengguna"}. Data keuangan: ${JSON.stringify(finance)}` }, ...history, { role: "user", content: message }] }) });
    stage = "groq_response";
    const payload: any = await completion.json();
    if (!completion.ok) {
      console.error("AI provider error", completion.status, payload?.error?.message);
      return res.status(502).json({ error: `Groq (${completion.status}): ${String(payload?.error?.message || "Provider menolak request.").slice(0, 220)}` });
    }
    stage = "save_messages";
    const choice = payload?.choices?.[0];
    const rawContent = choice?.message?.content;
    const answer = (typeof rawContent === "string"
      ? rawContent
      : Array.isArray(rawContent)
        ? rawContent.map((part: any) => typeof part?.text === "string" ? part.text : "").join("\\n")
        : "").trim();
    if (!answer) {
      try { await settleCredit(false); } catch (settleError) {
        console.error("ai-assistant credit refund failed:", settleError);
        return res.status(503).json({ error: "AI gagal menjawab dan pengembalian kredit sedang diproses." });
      }
      console.error("AI empty completion", JSON.stringify({
        model, finish_reason: choice?.finish_reason ?? null,
        usage: payload?.usage ?? null,
        response_id: payload?.id ?? null,
        response_keys: payload && typeof payload === "object" ? Object.keys(payload) : [],
        message_keys: choice?.message && typeof choice.message === "object" ? Object.keys(choice.message) : [],
        refusal: choice?.message?.refusal ?? null,
      }));
      return res.status(502).json({
        error: `AI tidak mengirim teks jawaban (finish_reason: ${String(choice?.finish_reason || "tidak tersedia")}). Coba kirim ulang.`,
      });
    }
    let settledCredit: any;
    try {
      settledCredit = await settleCredit(true);
    } catch (settleError) {
      console.error("ai-assistant credit commit failed:", settleError);
      return res.status(503).json({ error: "Jawaban AI sudah diproses, tetapi status kredit belum tersimpan. Hubungi support sebelum mengulang." });
    }

    const { error: saveUserError } = await db.from("ai_messages").insert({ conversation_id: conversationId, user_id: String(currentUser.user_id), role: "user", content: message });
    if (saveUserError) throw saveUserError;
    const { error: saveAssistantError } = await db.from("ai_messages").insert({ conversation_id: conversationId, user_id: String(currentUser.user_id), role: "assistant", content: answer });
    if (saveAssistantError) throw saveAssistantError;
    await db.from("ai_conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId).eq("user_id", String(currentUser.user_id));
    return res.status(200).json({ conversationId, answer, creditsRemaining: Number(settledCredit?.credits_remaining) || 0 });
  } catch (error) {
    console.error(`AI Assistant API error at ${stage}:`, error);
    const detail = error instanceof Error ? error.message : "Unknown server error";
    return res.status(500).json({ error: `Gagal pada tahap ${stage}: ${detail.slice(0, 180)}` });
  }
}
function sixty() { return 60; }
