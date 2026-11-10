import { useEffect, useMemo, useState } from "react";
const API_BASE = "/api";
import { Check, ExternalLink, GripVertical, Plus, Settings2, Trash2, User as UserIcon, Loader2, RotateCcw, Crown } from "lucide-react";
import { Card } from "../components/Card";
import { getDisplayName, setDisplayName } from "../lib/settings";
import { getAppLanguage, setAppLanguage, type AppLanguage } from "../lib/format";
import { getStoredToken, useFinanceData } from "../lib/useFinanceData";

type SectionKey = "income" | "expense" | "saving" | "bank";
type SetupItem = { name: string; active: boolean };

type SetupState = Record<SectionKey, SetupItem[]>;

const EMPTY_SETUP: SetupState = { income: [], expense: [], saving: [], bank: [] };
const SECTION_META: { key: SectionKey; title: string; subtitle: string; tone: string }[] = [
  { key: "income", title: "Income", subtitle: "Sumber pemasukan", tone: "bg-[#0B6B47]" },
  { key: "expense", title: "Expense", subtitle: "Pengeluaran & budget", tone: "bg-[#D44F76]" },
  { key: "saving", title: "Saving & Investment", subtitle: "Tabungan & investasi", tone: "bg-[#D9822B]" },
  { key: "bank", title: "Bank Account", subtitle: "Akun kas & bank", tone: "bg-[#6F46B0]" },
];

function cloneSetup(value: SetupState): SetupState {
  return JSON.parse(JSON.stringify(value));
}

export function Settings() {
  const { username } = useFinanceData();
  const [name, setName] = useState(() => getDisplayName());
  const [savedName, setSavedName] = useState(false);
  const [language, setLanguage] = useState<AppLanguage>(() => getAppLanguage());
  useEffect(() => { const updateLanguage = () => setLanguage(getAppLanguage()); window.addEventListener("wealthplanner:language-changed", updateLanguage); return () => window.removeEventListener("wealthplanner:language-changed", updateLanguage); }, []);
  const id = language === "id";
  const [setup, setSetup] = useState<SetupState>(EMPTY_SETUP);
  const [original, setOriginal] = useState<SetupState>(EMPTY_SETUP);
  const [spreadsheetUrl, setSpreadsheetUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [membership, setMembership] = useState<any>(null);
  const [membershipLoading, setMembershipLoading] = useState(true);
  const [membershipError, setMembershipError] = useState("");
  const [paymentLoading, setPaymentLoading] = useState<"ai_pro_monthly" | "ai_pro_annual" | null>(null);

  async function loadMembership() {
    const token = getStoredToken();
    if (!token) { setMembershipLoading(false); return; }
    setMembershipLoading(true);
    setMembershipError("");
    try {
      const response = await fetch(`${API_BASE}/ai-membership?token=${encodeURIComponent(token)}`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Gagal memuat membership AI.");
      setMembership(data);
    } catch (e) {
      setMembershipError(e instanceof Error ? e.message : "Gagal memuat membership AI.");
    } finally {
      setMembershipLoading(false);
    }
  }

  async function purchaseAIMembership(plan: "ai_pro_monthly" | "ai_pro_annual") {
    const token = getStoredToken();
    if (!token) { setMembershipError("Sesi dashboard tidak ditemukan. Muat ulang halaman."); return; }
    setPaymentLoading(plan);
    setMembershipError("");
    try {
      const response = await fetch(`${API_BASE}/create-ai-membership-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, plan }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.paymentLink) throw new Error(data.error || "Gagal membuat pembayaran AI PRO+.");
      window.location.assign(data.paymentLink);
    } catch (e) {
      setMembershipError(e instanceof Error ? e.message : "Gagal membuat pembayaran AI PRO+.");
      setPaymentLoading(null);
    }
  }

  async function loadSetup() {
    const token = getStoredToken();
    if (!token) {
      setLoading(false);
      setError("Hubungkan dashboard ke akunmu dulu agar setup bisa disimpan ke spreadsheet.");
      return;
    }
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API_BASE}/setup?token=${encodeURIComponent(token)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memuat setup");
      const next = { ...EMPTY_SETUP, ...data.sections } as SetupState;
      setSetup(next); setOriginal(cloneSetup(next)); setSpreadsheetUrl(data.spreadsheetUrl || "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat setup");
    } finally { setLoading(false); }
  }

  useEffect(() => {
    loadSetup();
    loadMembership();

    // After returning from Xendit, the webhook may still be processing.
    // Poll briefly so a successful payment appears as active without
    // requiring the user to manually refresh the page.
    const params = new URLSearchParams(window.location.search);
    if (params.get("membership") === "success") {
      let attempts = 0;
      const poll = window.setInterval(async () => {
        attempts += 1;
        await loadMembership();
        if (attempts >= 5) window.clearInterval(poll);
      }, 2500);
      return () => window.clearInterval(poll);
    }
  }, []);

  const changed = useMemo(() => JSON.stringify(setup) !== JSON.stringify(original), [setup, original]);

  function updateSection(section: SectionKey, items: SetupItem[]) {
    setSetup((s) => ({ ...s, [section]: items }));
  }

  function addItem(section: SectionKey) {
    updateSection(section, [...setup[section], { name: "", active: true }]);
  }

  function removeItem(section: SectionKey, index: number) {
    updateSection(section, setup[section].filter((_, i) => i !== index));
  }

  function updateItem(section: SectionKey, index: number, patch: Partial<SetupItem>) {
    updateSection(section, setup[section].map((item, i) => i === index ? { ...item, ...patch } : item));
  }

  async function saveSetup() {
    const token = getStoredToken();
    if (!token) return;
    const cleaned = cloneSetup(setup);
    (Object.keys(cleaned) as SectionKey[]).forEach((key) => {
      cleaned[key] = cleaned[key].filter((x) => x.name.trim()).map((x) => ({ name: x.name.trim(), active: x.active }));
    });
    // Explicitly identify in-place bank renames. Reordering, removing, or adding
    // banks alone must not rewrite historical transaction references.
    const originalBankNames = new Set(original.bank.map((item) => item.name.trim().replace(/\s+/g, " ").toLowerCase()).filter(Boolean));
    const cleanedBankNames = new Set(cleaned.bank.map((item) => item.name.trim().replace(/\s+/g, " ").toLowerCase()).filter(Boolean));
    const renames = original.bank.flatMap((item, index) => {
      const from = item.name.trim().replace(/\s+/g, " ");
      const to = cleaned.bank[index]?.name.trim().replace(/\s+/g, " ") || "";
      const oldKey = from.toLowerCase();
      const newKey = to.toLowerCase();
      return from && to && oldKey !== newKey && !cleanedBankNames.has(oldKey) && !originalBankNames.has(newKey)
        ? [{ section: "bank", from, to }]
        : [];
    });
    setSaving(true); setError(""); setMessage("");
    try {
      const res = await fetch(`${API_BASE}/setup`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, sections: cleaned, renames }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan setup");
      setSetup(cleaned); setOriginal(cloneSetup(cleaned)); window.dispatchEvent(new CustomEvent("wealthplanner:setup-changed")); setMessage("Setup tersimpan ke spreadsheet.");
      setTimeout(() => setMessage(""), 2500);
    } catch (e) { setError(e instanceof Error ? e.message : "Gagal menyimpan setup"); }
    finally { setSaving(false); }
  }

  function handleSaveName() {
    setDisplayName(name); setSavedName(true); setTimeout(() => setSavedName(false), 1800);
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h1 className="page-title">{id ? "Profil & Pengaturan" : "Profile & Settings"}</h1>
        <p className="page-sub">{id ? "Atur profil dan baseline keuanganmu. Perubahan setup akan disimpan ke spreadsheet." : "Aktifkan baseline keuanganmu. Perubahan di sini akan ditulis ke spreadsheet."}</p>
        <button type="button" onClick={() => window.dispatchEvent(new CustomEvent("wealthplanner:start-tour", { detail: { type: "main", route: "/" } }))} className="mt-2 inline-flex min-h-10 items-center rounded-full border border-forest-100 bg-forest-50 px-4 py-2 text-[12px] font-semibold text-forest-700">Mulai panduan interaktif</button>
      </div>

      <Card className="!p-4 sm:!p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#CFEFDD] text-[#0B6B47]"><Settings2 size={19} /></span>
            <div><h3 className="text-[15px] font-semibold text-forest-900">{id ? "Pengaturan Baseline Keuangan" : "Financial Baseline Setup"}</h3><p className="text-[12px] text-charcoal/50 mt-0.5">{id ? "Pilih kategori yang ingin digunakan. Klik + untuk menambahkan kategori sendiri." : "Centang kategori yang ingin dipakai. Klik + untuk menambah kategori sendiri."}</p></div>
          </div>
          <div className="flex items-center gap-2">
            {spreadsheetUrl && <a href={spreadsheetUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-charcoal/12 bg-white px-3.5 py-2.5 text-[12px] font-medium text-charcoal/70 hover:border-forest-200 hover:text-forest-700"><ExternalLink size={13}/> {id ? "Buka Spreadsheet" : "Open Spreadsheet"}</a>}
            <button onClick={saveSetup} disabled={!changed || saving || loading} className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#123524] px-5 py-2.5 text-[12.5px] font-semibold text-white shadow-sm hover:bg-forest-800 disabled:opacity-40">
              {saving ? <Loader2 size={13} className="animate-spin"/> : <Check size={13}/>} {saving ? (id ? "Menyimpan..." : "Saving...") : (id ? "Simpan Pengaturan" : "Save Setup")}
            </button>
          </div>
        </div>

        {error && <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-[12.5px] leading-snug text-rose-700">{error}</div>}
        {message && <div className="mt-4 rounded-2xl border border-forest-100 bg-forest-50 px-3.5 py-3 text-[12.5px] text-forest-700">{message}</div>}

        {loading ? <div className="py-12 flex justify-center text-charcoal/40"><Loader2 className="animate-spin"/></div> :
          <div className="mt-6 overflow-x-auto pb-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {SECTION_META.map((section) => (
                <SetupSection key={section.key} meta={section} items={setup[section.key]} onAdd={() => addItem(section.key)} onRemove={(i) => removeItem(section.key, i)} onUpdate={(i, patch) => updateItem(section.key, i, patch)} />
              ))}
            </div>
          </div>
        }
      </Card>

      <Card className="max-w-2xl">
        <div className="flex items-center gap-2 mb-4"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FBD3E0] text-[#B83A62]"><UserIcon size={19}/></span><h3 className="text-[15px] font-semibold text-forest-900">{id ? "Profil" : "Profile"}</h3></div>
        <div className="mb-5"><label className="text-[13px] font-medium text-charcoal/75">{id ? "Bahasa Aplikasi" : "App Language"}</label><p className="text-[12px] text-charcoal/50 mt-0.5 mb-2">{id ? "Pilih bahasa tampilan aplikasi." : "Choose the app display language."}</p><select value={language} onChange={(e) => { const next = e.target.value as AppLanguage; setLanguage(next); setAppLanguage(next); }} className="w-full max-w-xs border border-charcoal/15 rounded-xl px-3.5 py-3 text-[14px] bg-white"><option value="id">Bahasa Indonesia</option><option value="en">{id ? "English" : "English"}</option></select></div>
        <label className="text-[13px] font-medium text-charcoal/75">{id ? "Nama Tampilan" : "Display Name"}</label>
        <p className="text-[12px] text-charcoal/50 mt-0.5 mb-2">{id ? "Dipakai untuk sapaan di dashboard. Kalau kosong, nama akun digunakan sebagai fallback." : "Used for dashboard greetings. If blank, your account name will be used."}</p>
        <div className="flex gap-2"><input value={name} onChange={(e) => setName(e.target.value)} placeholder={username || (id ? "Nama kamu" : "Your name")} className="min-w-0 flex-1 border border-charcoal/15 rounded-xl px-3.5 py-3 text-[14px] outline-none focus:border-forest-400 focus:ring-2 focus:ring-forest-100"/><button onClick={handleSaveName} className="flex items-center gap-1.5 bg-[#123524] text-white rounded-xl px-5 py-3 text-[13px] font-semibold hover:bg-forest-800">{savedName && <Check size={14}/>} {savedName ? (id ? "Tersimpan" : "Saved") : (id ? "Simpan" : "Save")}</button></div>
      </Card>

      <Card className="max-w-2xl">
        <div className="flex items-center gap-3 mb-4">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#E9E2FF] text-[#6845A5]"><Crown size={19}/></span>
          <div><h3 className="text-[15px] font-semibold text-forest-900">AI Membership</h3><p className="text-[12px] text-charcoal/50 mt-0.5">Kelola akses AI Financial Assistant dan AI Scan Struk.</p></div>
        </div>
        {membershipLoading ? <div className="py-6 flex justify-center text-charcoal/40"><Loader2 className="animate-spin"/></div> : membership ? (
          <div className="rounded-2xl border border-charcoal/10 bg-charcoal/[0.025] p-4 mb-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[13px] font-semibold text-charcoal">Status akses AI PRO+</span>
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${membership.aiAccess === "active" ? "bg-forest-100 text-forest-700" : "bg-charcoal/10 text-charcoal/60"}`}>{membership.aiAccess === "active" ? (membership.aiAccessSource === "ai_pro" ? "Aktif" : "Aktif — Trial") : "Tidak aktif"}</span>
            </div>
            <div className="mt-4">
              <p className="text-[11px] text-charcoal/50">Sisa kredit AI</p>
              <p className="text-[22px] font-bold text-forest-900">{Number(membership.creditsRemaining || 0).toLocaleString("id-ID")} <span className="text-[11px] font-medium text-charcoal/50">credits</span></p>
            </div>
            {membership.aiMembershipPlan && membership.aiMembershipStartedAt && membership.aiMembershipExpiresAt && (
              <div className="mt-4 rounded-xl border border-forest-100 bg-forest-50/50 px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-charcoal/50">AI PRO+ {membership.aiMembershipPlan === "ai_pro_annual" ? "Tahunan" : "Bulanan"}</span>
                  <span className="text-[11px] font-semibold text-forest-700">Aktif</span>
                </div>
                <p className="mt-1 text-[12px] font-medium text-forest-900">
                  {new Date(membership.aiMembershipStartedAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                  {" → "}
                  {new Date(membership.aiMembershipExpiresAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>
            )}
            {membership.aiTrialExpiresAt && !membership.aiMembershipStartedAt && <p className="mt-3 text-[11px] text-charcoal/55">Trial AI sampai {new Date(membership.aiTrialExpiresAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}.</p>}
            {membership.aiMembershipExpiresAt && !membership.aiMembershipStartedAt && <p className="mt-1 text-[11px] text-charcoal/55">AI PRO+ sampai {new Date(membership.aiMembershipExpiresAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}.</p>}
          </div>
        ) : null}
        {membershipError && <p className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-[12px] text-rose-700">{membershipError}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-2xl border border-charcoal/10 p-3.5">
            <p className="text-[13px] font-semibold text-charcoal">AI PRO+ Bulanan</p>
            <p className="mt-3 text-[17px] font-bold text-forest-900">300 Kredit per 30 Hari</p>
            <p className="text-[10.5px] text-charcoal/45">1 penggunaan AI = 1 kredit</p>
            <p className="num text-[28px] font-bold text-forest-900 mt-2">Rp 20.000 <span className="text-[11px] font-medium text-charcoal/50">/ bulan</span></p>
            <button onClick={() => purchaseAIMembership("ai_pro_monthly")} disabled={paymentLoading !== null} className="mt-3 w-full rounded-full bg-[#123524] px-3 py-2.5 text-[12px] font-semibold text-white disabled:opacity-50">{paymentLoading === "ai_pro_monthly" ? "Menyiapkan..." : "Pilih Bulanan"}</button>
          </div>
          <div className="rounded-2xl border border-charcoal/10 p-3.5">
            <p className="text-[13px] font-semibold text-charcoal">AI PRO+ Tahunan</p>
            <p className="mt-3 text-[17px] font-bold text-forest-900">300 Kredit per 30 Hari</p>
            <p className="text-[10.5px] text-charcoal/45">1 penggunaan AI = 1 kredit</p>
            <p className="mt-2"><span className="text-[11px] text-charcoal/35 line-through">Rp 20.000 / bulan</span> <span className="text-[28px] font-bold text-forest-900">Rp16.583 <span className="text-[11px] font-medium text-charcoal/50">/ bulan</span></span></p>
            <p className="text-[11px] font-medium text-charcoal/50 mt-0.5">Rp199.000 / tahun</p>
            <button onClick={() => purchaseAIMembership("ai_pro_annual")} disabled={paymentLoading !== null} className="mt-3 w-full rounded-full bg-[#123524] px-3 py-2.5 text-[12px] font-semibold text-white disabled:opacity-50">{paymentLoading === "ai_pro_annual" ? "Menyiapkan..." : "Pilih Tahunan"}</button>
          </div>
        </div>
        <p className="mt-3 text-[10.5px] leading-relaxed text-charcoal/45">Pembayaran melalui Xendit. Perpanjangan dilakukan manual dan tidak menggunakan auto-debit.</p>
        <button onClick={loadMembership} className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-medium text-charcoal/55 hover:text-forest-700"><RotateCcw size={12}/> Perbarui status</button>
      </Card>
    </div>
  );
}

function SetupSection({ meta, items, onAdd, onRemove, onUpdate }: { meta: typeof SECTION_META[number]; items: SetupItem[]; onAdd: () => void; onRemove: (index: number) => void; onUpdate: (index: number, patch: Partial<SetupItem>) => void; }) {
  const [language, setLanguage] = useState<AppLanguage>(() => getAppLanguage());
  useEffect(() => { const update = () => setLanguage(getAppLanguage()); window.addEventListener("wealthplanner:language-changed", update); return () => window.removeEventListener("wealthplanner:language-changed", update); }, []);
  const id = language === "id";
  const title = id ? ({ income: "Pemasukan", expense: "Pengeluaran", saving: "Tabungan & Investasi", bank: "Akun Bank" } as Record<SectionKey,string>)[meta.key] : meta.title;
  const subtitle = id ? ({ income: "Sumber pemasukan", expense: "Pengeluaran & anggaran", saving: "Tabungan & investasi", bank: "Akun kas & bank" } as Record<SectionKey,string>)[meta.key] : ({ income: "Income sources", expense: "Expenses & budget", saving: "Savings & investments", bank: "Cash & bank accounts" } as Record<SectionKey,string>)[meta.key];
  return (
    <div className="rounded-[14px] border border-charcoal/8 bg-white overflow-hidden">
      <div className={`${meta.tone} px-4 py-3.5 text-white`}><div className="flex items-center justify-between"><p className="text-[14.5px] font-bold tracking-[-0.01em]">{title}</p><span className="rounded-full bg-white/20 px-2 py-0.5 text-[10.5px] font-semibold text-white">{items.filter(i => i.active).length} {id ? "aktif" : "active"}</span></div><p className="text-[11.5px] text-white/80 mt-0.5">{subtitle}</p></div>
      <div className="px-3.5 py-2 bg-charcoal/[0.03] border-b border-charcoal/8 flex items-center justify-between text-[11px] font-semibold text-charcoal/50"><span>{id ? "Kategori" : "Category"}</span><span>{id ? "Status" : "Status"}</span></div>
      <div className="p-1.5 max-h-[420px] overflow-y-auto">
        {items.map((item, index) => (
          <div key={`${meta.key}-${index}`} className="group flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-charcoal/[0.035]">
            <GripVertical size={12} className="text-charcoal/20 shrink-0" />
            <input value={item.name} onChange={(e) => onUpdate(index, { name: e.target.value })} placeholder={id ? "Nama kategori" : "Category name"} className="min-w-0 flex-1 bg-transparent text-[13.5px] text-charcoal outline-none border-b border-transparent focus:border-forest-300 py-0.5" />
            <button type="button" onClick={() => onUpdate(index, { active: !item.active })} aria-label={item.active ? "Nonaktifkan" : "Aktifkan"} className={`relative shrink-0 h-6 w-6 rounded-lg border transition ${item.active ? "border-forest-500 bg-forest-600 text-white" : "border-charcoal/30 bg-white text-transparent"}`}><Check size={13} className="absolute inset-0 m-auto" /></button>
            <button type="button" onClick={() => onRemove(index)} aria-label="Hapus kategori" className="shrink-0 p-1.5 text-charcoal/25 sm:opacity-0 group-hover:opacity-100 hover:text-rose-600"><Trash2 size={12}/></button>
          </div>
        ))}
        <button type="button" onClick={onAdd} className="mt-1.5 flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-charcoal/15 py-2.5 text-[12px] font-semibold text-charcoal/50 hover:border-forest-200 hover:text-forest-700"><Plus size={13}/> Add Category</button>
      </div>
    </div>
  );
}
