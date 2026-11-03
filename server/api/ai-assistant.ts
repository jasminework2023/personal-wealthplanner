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
    const completion = await fetch(endpoint, { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ model, temperature: 1, max_completion_tokens: 900, messages: [{ role: "system", content: `Kamu adalah Wealthplanner AI, asisten perencanaan keuangan pribadi yang ramah, jelas, dan tidak menghakimi. Jawab dalam bahasa Indonesia kecuali pengguna memakai bahasa lain. Gunakan data keuangan pengguna berikut hanya sebagai konteks; jangan mengarang angka. Jika data tidak cukup, katakan dengan jujur. Berikan edukasi, bukan rekomendasi investasi personal yang menjanjikan hasil. Nama pengguna: ${user.username || "Pengguna"}. Data keuangan: ${JSON.stringify(finance)}` }, ...history, { role: "user", content: message }] }) });
    stage = "groq_response";
    const payload: any = await completion.json();
    if (!completion.ok) {
      console.error("AI provider error", completion.status, payload?.error?.message);
      return res.status(502).json({ error: `Groq (${completion.status}): ${String(payload?.error?.message || "Provider menolak request.").slice(0, 220)}` });
    }
    stage = "save_messages";
    const answer = String(payload?.choices?.[0]?.message?.content || "").trim();
    if (!answer) return res.status(502).json({ error: "AI belum memberikan jawaban." });
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
