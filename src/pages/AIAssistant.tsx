import { useEffect, useState } from "react";
import { Bot, Plus, Send, MessageCircle, Loader2, ArrowLeft } from "lucide-react";
import { getStoredToken } from "../lib/useFinanceData";

type Message = { id?: string; role: "user" | "assistant"; content: string };
type Conversation = { id: string; title: string; updated_at: string };

export function AIAssistant() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationId, setConversationId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [error, setError] = useState("");
  const token = getStoredToken();

  async function loadConversations() {
    if (!token) return;
    const response = await fetch(`/api/ai-assistant?token=${encodeURIComponent(token)}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Gagal memuat riwayat.");
    setConversations(data.conversations || []);
  }
  async function openConversation(id: string) {
    if (!token) return;
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/ai-assistant?token=${encodeURIComponent(token)}&conversationId=${encodeURIComponent(id)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal membuka percakapan.");
      setConversationId(id); setMessages(data.messages || []); setHistoryOpen(false);
    } catch (e) { setError(e instanceof Error ? e.message : "Terjadi kesalahan."); }
    finally { setLoading(false); }
  }
  function newChat() { setConversationId(""); setMessages([]); setDraft(""); setHistoryOpen(false); setError(""); }
  async function sendMessage() {
    const message = draft.trim();
    if (!message || loading || !token) return;
    setDraft(""); setMessages((old) => [...old, { role: "user", content: message }]); setLoading(true); setError("");
    try {
      const response = await fetch("/api/ai-assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, conversationId: conversationId || undefined, message }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "AI belum bisa menjawab.");
      setConversationId(data.conversationId);
      setMessages((old) => [...old, { role: "assistant", content: data.answer }]);
      await loadConversations();
    } catch (e) {
      setMessages((old) => old.filter((m, i) => !(m.role === "user" && i === old.length - 1)));
      setDraft(message); setError(e instanceof Error ? e.message : "Terjadi kesalahan.");
    } finally { setLoading(false); }
  }
  useEffect(() => { loadConversations().catch((e) => setError(e.message)); }, []);

  return <div className="mx-auto flex min-h-[70vh] max-w-3xl flex-col gap-4 pb-5">
    <header className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#DDF7E8] text-[#0B6B47]"><Bot size={23}/></span><div><h1 className="text-lg font-bold text-forest-900">AI Assistant</h1><p className="text-xs text-charcoal/55">Teman ngobrol untuk memahami keuanganmu</p></div></div>
      <div className="flex gap-2"><button onClick={() => setHistoryOpen((v) => !v)} className="rounded-xl border border-forest-100 px-3 py-2 text-xs font-semibold text-forest-800"><MessageCircle size={15} className="mr-1 inline"/>Riwayat</button><button onClick={newChat} className="rounded-xl bg-[#0B6B47] px-3 py-2 text-xs font-semibold text-white"><Plus size={15} className="mr-1 inline"/>Chat baru</button></div>
    </header>
    {historyOpen && <section className="rounded-2xl border border-forest-100 bg-white p-3"><div className="mb-2 flex items-center gap-2 text-sm font-semibold text-forest-900"><button onClick={() => setHistoryOpen(false)} aria-label="Kembali"><ArrowLeft size={16}/></button>Riwayat percakapan</div>{conversations.length ? conversations.map((c) => <button key={c.id} onClick={() => openConversation(c.id)} className="block w-full rounded-xl px-3 py-2 text-left text-sm text-charcoal hover:bg-forest-50">{c.title}</button>) : <p className="p-3 text-sm text-charcoal/50">Belum ada percakapan.</p>}</section>}
    <section className="flex-1 space-y-3 rounded-3xl border border-forest-100 bg-white p-4 shadow-sm">
      {messages.length === 0 && <div className="mx-auto max-w-md py-12 text-center"><span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#DDF7E8] text-[#0B6B47]"><SparkleIcon/></span><h2 className="text-base font-bold text-forest-900">Apa yang ingin kamu pahami?</h2><p className="mt-2 text-sm leading-relaxed text-charcoal/60">Tanyakan tentang cash flow, pengeluaran, aset, anggaran, atau tujuan finansialmu. Aku akan menggunakan data dashboard yang terhubung.</p><div className="mt-5 flex flex-wrap justify-center gap-2">{["Bagaimana kondisi cash flow-ku?","Kategori pengeluaran terbesarku apa?","Apa yang perlu aku perbaiki bulan ini?"].map((q) => <button key={q} onClick={() => setDraft(q)} className="rounded-full border border-forest-100 px-3 py-2 text-xs text-forest-800 hover:bg-forest-50">{q}</button>)}</div></div>}
      {messages.map((m, i) => <div key={m.id || i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}><div className={m.role === "user" ? "max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-[#0B6B47] px-4 py-3 text-sm leading-relaxed text-white" : "max-w-[90%] whitespace-pre-wrap rounded-2xl rounded-bl-md bg-[#F1F8F4] px-4 py-3 text-sm leading-relaxed text-forest-900"}>{m.content}</div></div>)}
      {loading && <div className="flex items-center gap-2 text-xs text-charcoal/50"><Loader2 size={15} className="animate-spin"/>Sedang menyiapkan jawaban...</div>}
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-xs text-red-700">{error}</p>}
    </section>
    <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex items-end gap-2 rounded-2xl border border-forest-100 bg-white p-2 shadow-sm"><textarea value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} placeholder="Tulis pertanyaan tentang keuanganmu..." rows={1} className="max-h-32 min-h-11 flex-1 resize-y bg-transparent px-3 py-3 text-sm outline-none" /><button disabled={!draft.trim() || loading || !token} aria-label="Kirim pesan" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0B6B47] text-white disabled:opacity-40"><Send size={18}/></button></form>
    {!token && <p className="text-center text-xs text-amber-700">Buka dashboard melalui tautan akunmu untuk menggunakan AI Assistant.</p>}
  </div>;
}
function SparkleIcon() { return <Bot size={26}/>; }
