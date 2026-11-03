import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";
import type { VercelRequest, VercelResponse } from "@vercel/node";

function getDb() {
  return createClient(process.env.SUPABASE_URL as string, process.env.SUPABASE_SERVICE_ROLE_KEY as string);
}
async function getFinanceContext(spreadsheetId: string) {
  const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS as string);
  const auth = new google.auth.JWT({ email: credentials.client_email, key: credentials.private_key, scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"] });
  const sheets = google.sheets({ version: "v4", auth });
  const result = await sheets.spreadsheets.values.batchGet({ spreadsheetId, ranges: ["Transaction!B10:I", "Asset Tracker!B1:N45", "Budgeting!B1:N40"], valueRenderOption: "FORMATTED_VALUE" });
  const [tx = [], assets = [], budget = []] = (result.data.valueRanges || []).map((r) => r.values || []);
  const transactions = tx.slice(-35).map((r) => ({ date: r[0], type: r[2], category: r[3], description: r[4], amount: r[5], wallet: r[6] }));
  return { recentTransactions: transactions, assetTracker: assets.slice(0, 45), budget: budget.slice(0, 40) };
}
export default async function handler(req: VercelRequest, res: VercelResponse) {
  let stage = "request";
  const token = String(req.method === "GET" ? req.query.token || "" : req.body?.token || "").trim();
  if (!token) return res.status(400).json({ error: "Token tidak ditemukan." });
  try {
    stage = "database";
    const db = getDb();
    const { data: user, error } = await db.from("users").select("user_id, username, spreadsheet_id, is_active").eq("dashboard_token", token).single();
    if (error || !user || !user.is_active || !user.spreadsheet_id) return res.status(403).json({ error: "Akses dashboard tidak valid atau belum aktif." });
    if (req.method === "GET") {
      const requestedConversation = String(req.query.conversationId || "").trim();
      if (requestedConversation) {
        const { data: owned } = await db.from("ai_conversations").select("id").eq("id", requestedConversation).eq("user_id", String(user.user_id)).single();
        if (!owned) return res.status(404).json({ error: "Percakapan tidak ditemukan." });
        const { data: messages, error: messageError } = await db.from("ai_messages").select("id,role,content,created_at").eq("conversation_id", requestedConversation).eq("user_id", String(user.user_id)).order("created_at", { ascending: true }).limit(100);
        if (messageError) throw messageError;
        return res.status(200).json({ messages: messages || [] });
      }
      const { data, error: listError } = await db.from("ai_conversations").select("id,title,created_at,updated_at").eq("user_id", String(user.user_id)).order("updated_at", { ascending: false }).limit(30);
      if (listError) throw listError;
      return res.status(200).json({ conversations: data || [] });
    }
    if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });
    const message = String(req.body?.message || "").trim().slice(0, 4000);
    let conversationId = String(req.body?.conversationId || "").trim();
    if (!message) return res.status(400).json({ error: "Tulis pertanyaan terlebih dahulu." });
    let conversation: any;
    if (conversationId) {
      const { data, error: convError } = await db.from("ai_conversations").select("id,title").eq("id", conversationId).eq("user_id", String(user.user_id)).single();
      if (convError || !data) return res.status(404).json({ error: "Percakapan tidak ditemukan." });
      conversation = data;
    } else {
      const { data, error: convError } = await db.from("ai_conversations").insert({ user_id: String(user.user_id), title: message.slice(0, sixty()) }).select("id,title").single();
      if (convError || !data) throw convError || new Error("Gagal membuat percakapan.");
      conversation = data; conversationId = data.id;
    }
    stage = "conversation_history";
    const { data: previous, error: historyError } = await db.from("ai_messages").select("role,content").eq("conversation_id", conversationId).eq("user_id", String(user.user_id)).order("created_at", { ascending: false }).limit(12);
    if (historyError) throw historyError;
    stage = "google_sheets";
    const finance = await getFinanceContext(user.spreadsheet_id);
    const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;
    const endpoint = process.env.GROQ_API_KEY ? "https://api.groq.com/openai/v1/chat/completions" : "https://api.openai.com/v1/chat/completions";
    const model = process.env.GROQ_API_KEY ? (process.env.GROQ_CHAT_MODEL || "openai/gpt-oss-20b") : (process.env.OPENAI_CHAT_MODEL || "gpt-4.1-mini");
    if (!apiKey) return res.status(503).json({ error: "AI belum dikonfigurasi. Hubungi administrator." });
    const history = (previous || []).reverse().map((m: any) => ({ role: m.role, content: m.content }));
    stage = "groq_request";
    const completion = await fetch(endpoint, { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ model, temperature: 1, max_completion_tokens: 2400, messages: [{ role: "system", content: `Kamu adalah Wealthplanner AI, teman diskusi perencanaan keuangan pribadi yang ramah, hangat, ringkas, dan tidak menghakimi. Jawab dalam bahasa Indonesia. PENTING: jawab langsung sesuai pertanyaan, idealnya 80-140 kata dan maksimal 180 kata kecuali pengguna meminta perhitungan/penjelasan rinci. Jangan memberi kuliah atau panduan panjang sekaligus. Untuk konsultasi tujuan (pendidikan, rumah, pensiun, haji, warisan), pandu bertahap: jelaskan inti dalam 1-2 kalimat lalu ajukan HANYA SATU pertanyaan paling penting untuk langkah berikutnya. Gunakan paragraf pendek dan maksimal 3-5 bullet jika perlu. Jangan gunakan tabel Markdown, heading berulang, garis pemisah, atau menampilkan simbol Markdown mentah. Gunakan bold seperlunya. Jangan mengulang pertanyaan pengguna. ATURAN SUMBER DATA: satu-satunya sumber fakta keuangan pribadi pengguna adalah DATA KEUANGAN TERHUBUNG yang disisipkan di bawah instruksi ini, yang diambil dari spreadsheet_id milik akun yang token dashboard-nya sudah divalidasi. Jangan memakai contoh, asumsi, atau data pengguna lain sebagai fakta pengguna ini. Jangan mengarang saldo, pendapatan, pengeluaran, aset, utang, kategori, target, tanggal, atau tren. Jangan menyimpulkan data kosong sebagai nilai nol. Jika informasi tidak ada, tidak lengkap, ambigu, atau periode datanya tidak jelas, katakan terus terang dalam satu kalimat lalu ajukan SATU pertanyaan untuk melengkapi data. Saat menyebut angka, pastikan angka itu benar-benar muncul di data terhubung atau hasil hitung transparan dari angka tersebut; sebutkan periode jika tersedia. Bedakan transaksi, aset, anggaran, dan target; jangan menganggap anggaran sebagai pengeluaran aktual atau aset sebagai saldo kas. Jika pengguna bertanya tentang sesuatu yang belum tercatat di dashboard (misalnya dana pendidikan), jangan berpura-pura target itu sudah tersimpan; bantu mulai dengan menanyakan satu informasi paling penting. Jika pertanyaan tidak membutuhkan data pribadi, jawab secara umum dan jangan mengklaim sedang membaca dashboard. Berikan edukasi, bukan janji hasil investasi atau rekomendasi investasi personal. Nama pengguna: ${user.username || "Pengguna"}. Data keuangan: ${JSON.stringify(finance)}` }, ...history, { role: "user", content: message }] }) });
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
    const { error: saveUserError } = await db.from("ai_messages").insert({ conversation_id: conversationId, user_id: String(user.user_id), role: "user", content: message });
    if (saveUserError) throw saveUserError;
    const { error: saveAssistantError } = await db.from("ai_messages").insert({ conversation_id: conversationId, user_id: String(user.user_id), role: "assistant", content: answer });
    if (saveAssistantError) throw saveAssistantError;
    await db.from("ai_conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId).eq("user_id", String(user.user_id));
    return res.status(200).json({ conversationId, answer });
  } catch (error) {
    console.error(`AI Assistant API error at ${stage}:`, error);
    const detail = error instanceof Error ? error.message : "Unknown server error";
    return res.status(500).json({ error: `Gagal pada tahap ${stage}: ${detail.slice(0, 180)}` });
  }
}
function sixty() { return 60; }
