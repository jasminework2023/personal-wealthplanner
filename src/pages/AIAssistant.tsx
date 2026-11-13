import { useEffect, useState } from "react";
import { Bot, Plus, Send, History, X } from "lucide-react";
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
  const [aiAccess, setAiAccess] = useState<"active" | "expired" | "loading">("loading");
  const token = getStoredToken();

  async function checkAIAccess() {
    if (!token) { setAiAccess("expired"); return false; }
    try {
      const response = await fetch(`/api/ai-membership?token=${encodeURIComponent(token)}&t=${Date.now()}`, { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      const active = response.ok && data.aiAccess === "active";
      setAiAccess(active ? "active" : "expired");
      return active;
    } catch {
      setAiAccess("expired");
      return false;
    }
  }

  async function loadConversations() {
    if (!token) return;
    if (!(await checkAIAccess())) return;
    const response = await fetch(`/api/ai-assistant?token=${encodeURIComponent(token)}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Gagal memuat riwayat.");
    setConversations(data.conversations || []);
  }
  async function openConversation(id: string) {
    if (!token) return;
    if (!(await checkAIAccess())) { setError("Akses AI PRO+ kamu tidak aktif."); return; }
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
    if (!message || loading || !token || aiAccess !== "active") return;
    if (!(await checkAIAccess())) { setError("Akses AI PRO+ kamu tidak aktif. Aktifkan membership untuk melanjutkan."); return; }
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
  useEffect(() => { checkAIAccess().then((active) => { if (active) loadConversations().catch((e) => setError(e.message)); }); }, []);

  return <div className="mx-auto flex min-h-[calc(100dvh-150px)] max-w-3xl flex-col pb-28 lg:min-h-[calc(100dvh-170px)] lg:pb-4">
    <section data-tour="ai-assistant-page" className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-forest-100 bg-white shadow-sm">
      <div className="min-h-[300px] flex-1 space-y-3 overflow-y-auto overscroll-contain p-4">
        {aiAccess === "expired" && <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">Akses AI PRO+ kamu tidak aktif. Aktifkan membership di <b>Profile & Settings</b> untuk menggunakan AI.</div>}
        {messages.length === 0 && <div className="mx-auto max-w-md py-10 text-center"><span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#DDF7E8] text-[#0B6B47]"><SparkleIcon/></span><h2 className="text-base font-bold text-forest-900">Apa yang ingin kamu pahami?</h2><p className="mt-2 text-sm leading-relaxed text-charcoal/60">Tanyakan tentang cash flow, pengeluaran, aset, anggaran, atau tujuan finansialmu. Aku akan menggunakan data dashboard yang terhubung.</p><div className="mt-5 flex flex-wrap justify-center gap-2">{["Bagaimana kondisi cash flow-ku?","Kategori pengeluaran terbesarku apa?","Apa yang perlu aku perbaiki bulan ini?"].map((q) => <button key={q} onClick={() => setDraft(q)} className="rounded-full border border-forest-100 px-3 py-2 text-xs text-forest-800 hover:bg-forest-50">{q}</button>)}</div></div>}
        {messages.map((m, i) => <div key={m.id || i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}><div className={m.role === "user" ? "max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-[#0B6B47] px-4 py-3 text-sm leading-relaxed text-white" : "max-w-[90%] whitespace-pre-wrap rounded-2xl rounded-bl-md bg-[#F1F8F4] px-4 py-3 text-sm leading-relaxed text-forest-900"}><MarkdownContent content={m.content}/></div></div>)}
        {loading && <div className="flex items-center gap-1.5 px-1 py-2 text-xs text-charcoal/50" aria-label="AI sedang mengetik"><span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" /></div>}
        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-xs text-red-700">{error}</p>}
      </div>
    </section>
    <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="fixed inset-x-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-forest-100 bg-white p-2 shadow-lg lg:sticky lg:bottom-0 lg:mt-3 lg:w-full">
      <textarea disabled={aiAccess !== "active"} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} placeholder="Tanya Wealth Planner AI" rows={1} className="max-h-32 min-h-11 flex-1 resize-y bg-transparent px-3 py-3 text-sm outline-none"/>
      <button type="button" onClick={() => setHistoryOpen(true)} aria-label="Riwayat pesan" title="Riwayat pesan" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[#0B6B47] hover:bg-[#E8F5ED]"><History size={19}/></button>
      <button disabled={!draft.trim() || loading || !token || aiAccess !== "active"} aria-label="Kirim pesan" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0B6B47] text-white disabled:opacity-40"><Send size={18}/></button>
    </form>
    {!token && <p className="mt-2 text-center text-xs text-amber-700">Buka dashboard melalui tautan akunmu untuk menggunakan AI Assistant.</p>
    <style>{`
      @keyframes wealthplannerTyping {
        0%, 60%, 100% { transform: translateY(0); opacity: .35; }
        30% { transform: translateY(-3px); opacity: 1; }
      }
      .typing-dot {
        width: 5px;
        height: 5px;
        border-radius: 9999px;
        background: currentColor;
        display: inline-block;
        animation: wealthplannerTyping 1.2s ease-in-out infinite;
      }
      .typing-dot:nth-child(2) { animation-delay: .15s; }
      .typing-dot:nth-child(3) { animation-delay: .3s; }
    `}</style>
}
    {historyOpen && <div className="fixed inset-0 z-[70]">
      <button type="button" aria-label="Tutup riwayat" onClick={() => setHistoryOpen(false)} className="absolute inset-0 bg-black/30"/>
      <aside className="absolute inset-y-0 left-0 flex w-[min(86vw,340px)] flex-col bg-white p-4 shadow-2xl">
        <div className="mb-4 flex items-center justify-between"><h2 className="text-base font-bold text-forest-900">Riwayat percakapan</h2><button type="button" onClick={() => setHistoryOpen(false)} aria-label="Tutup" className="rounded-lg p-2 text-charcoal/60"><X size={19}/></button></div>
        <button type="button" onClick={newChat} className="mb-3 flex items-center gap-2 rounded-xl bg-[#0B6B47] px-3 py-2.5 text-sm font-semibold text-white"><Plus size={16}/>Chat baru</button>
        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">{conversations.length ? conversations.map((c) => <button key={c.id} onClick={() => openConversation(c.id)} className={`block w-full rounded-xl px-3 py-3 text-left text-sm hover:bg-forest-50 ${conversationId === c.id ? "bg-forest-50 font-semibold text-forest-900" : "text-charcoal"}`}>{c.title}</button>) : <p className="p-3 text-sm text-charcoal/50">Belum ada percakapan.</p>}</div>
      </aside>
    </div>}
  </div>;
}

function SparkleIcon() { return <Bot size={26}/>; }


function MarkdownContent({ content }: { content: string }) {
  const lines = content.replace(/\r/g, "").split("\n");
  const blocks: Array<{ type: string; text: string }> = [];
  let paragraph: string[] = [];
  const flush = () => {
    if (paragraph.length) {
      blocks.push({ type: "p", text: paragraph.join(" ") });
      paragraph = [];
    }
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { flush(); continue; }
    if (/^\|?\s*:?-{3,}/.test(line) || /^\|.*\|$/.test(line) && /^\|?[\s|:-]+\|?$/.test(line)) { flush(); continue; }
    if (/^#{1,3}\s/.test(line)) { flush(); blocks.push({ type: "h", text: line.replace(/^#{1,3}\s*/, "") }); continue; }
    if (/^---+$/.test(line)) { flush(); continue; }
    if (/^[-*•]\s+/.test(line)) { flush(); blocks.push({ type: "li", text: line.replace(/^[-*•]\s+/, "") }); continue; }
    if (/^\|.*\|$/.test(line)) {
      const cells = line.split("|").slice(1, -1).map((cell) => cell.trim()).filter(Boolean);
      if (cells.length) blocks.push({ type: "li", text: cells.join(" — ") });
      continue;
    }
    paragraph.push(line.replace(/^\d+\.\s+/, ""));
  }
  flush();
  const inline = (text: string) => text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>
      : part
  );
  return <div className="space-y-2.5 break-words">
    {blocks.map((block, i) => block.type === "h"
      ? <h3 key={i} className="text-sm font-bold">{inline(block.text)}</h3>
      : block.type === "li"
        ? <div key={i} className="flex gap-2 pl-1"><span className="text-[#0B6B47]">•</span><span>{inline(block.text)}</span></div>
        : <p key={i}>{inline(block.text)}</p>)}
  </div>;
}
