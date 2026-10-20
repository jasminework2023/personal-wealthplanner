import { useEffect, useMemo, useState } from "react";
const API_BASE = "/api";
import { Check, ExternalLink, GripVertical, Plus, Settings2, Trash2, User as UserIcon, Loader2, RotateCcw } from "lucide-react";
import { Card } from "../components/Card";
import { getDisplayName, setDisplayName } from "../lib/settings";
import { getAppLanguage, setAppLanguage, type AppLanguage } from "../lib/format";
import { getStoredToken, useFinanceData } from "../lib/useFinanceData";

type SectionKey = "income" | "expense" | "saving" | "bank";
type SetupItem = { name: string; active: boolean };

type SetupState = Record<SectionKey, SetupItem[]>;

const EMPTY_SETUP: SetupState = { income: [], expense: [], saving: [], bank: [] };
const SECTION_META: { key: SectionKey; title: string; subtitle: string; tone: string }[] = [
  { key: "income", title: "Income", subtitle: "Sumber pemasukan", tone: "bg-[#2aa79d]" },
  { key: "expense", title: "Expense", subtitle: "Pengeluaran & budget", tone: "bg-[#d65f7b]" },
  { key: "saving", title: "Saving & Investment", subtitle: "Tabungan & investasi", tone: "bg-[#caa474]" },
  { key: "bank", title: "Bank Account", subtitle: "Akun kas & bank", tone: "bg-[#caa474]" },
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

  useEffect(() => { loadSetup(); }, []);

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
    setSaving(true); setError(""); setMessage("");
    try {
      const res = await fetch(`${API_BASE}/setup`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, sections: cleaned }),
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
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="page-title">{id ? "Profil & Pengaturan" : "Profile & Settings"}</h1>
        <p className="page-sub">{id ? "Atur profil dan baseline keuanganmu. Perubahan setup akan disimpan ke spreadsheet." : "Aktifkan baseline keuanganmu. Perubahan di sini akan ditulis ke spreadsheet."}</p>
      </div>

      <Card className="!p-4 sm:!p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#CFEFDD] text-[#0B6B47]"><Settings2 size={18} /></span>
            <div><h3 className="text-[15px] font-semibold text-forest-900">{id ? "Pengaturan Baseline Keuangan" : "Financial Baseline Setup"}</h3><p className="text-[12px] text-charcoal/50 mt-0.5">{id ? "Pilih kategori yang ingin digunakan. Klik + untuk menambahkan kategori sendiri." : "Centang kategori yang ingin dipakai. Klik + untuk menambah kategori sendiri."}</p></div>
          </div>
          <div className="flex items-center gap-2">
            {spreadsheetUrl && <a href={spreadsheetUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-charcoal/12 bg-white px-3.5 py-2.5 text-[12px] font-medium text-charcoal/70 hover:border-forest-200 hover:text-forest-700"><ExternalLink size={13}/> {id ? "Buka Spreadsheet" : "Open Spreadsheet"}</a>}
            <button onClick={saveSetup} disabled={!changed || saving || loading} className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#123524] px-5 py-2.5 text-[12.5px] font-semibold text-white shadow-sm hover:bg-forest-800 disabled:opacity-40">
              {saving ? <Loader2 size={13} className="animate-spin"/> : <Check size={13}/>} {saving ? (id ? "Menyimpan..." : "Saving...") : (id ? "Simpan Pengaturan" : "Save Setup")}
            </button>
          </div>
        </div>

        {error && <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">{error}</div>}
        {message && <div className="mt-4 rounded-lg border border-forest-100 bg-forest-50 px-3 py-2 text-[12px] text-forest-700">{message}</div>}

        {loading ? <div className="py-12 flex justify-center text-charcoal/40"><Loader2 className="animate-spin"/></div> :
          <div className="mt-6 overflow-x-auto pb-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {SECTION_META.map((section) => (
                <SetupSection key={section.key} meta={section} items={setup[section.key]} onAdd={() => addItem(section.key)} onRemove={(i) => removeItem(section.key, i)} onUpdate={(i, patch) => updateItem(section.key, i, patch)} />
              ))}
            </div>
          </div>
        }
      </Card>

      <Card className="max-w-2xl">
        <div className="flex items-center gap-2 mb-4"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-forest-50 text-forest-700"><UserIcon size={17}/></span><h3 className="text-[15px] font-semibold text-forest-900">{id ? "Profil" : "Profile"}</h3></div>
        <div className="mb-5"><label className="text-[13px] font-medium text-charcoal/75">{id ? "Bahasa Aplikasi" : "App Language"}</label><p className="text-[12px] text-charcoal/50 mt-0.5 mb-2">{id ? "Pilih bahasa tampilan aplikasi." : "Choose the app display language."}</p><select value={language} onChange={(e) => { const next = e.target.value as AppLanguage; setLanguage(next); setAppLanguage(next); }} className="w-full max-w-xs border border-charcoal/15 rounded-lg px-3 py-2 text-[14px] bg-white"><option value="id">Bahasa Indonesia</option><option value="en">{id ? "English" : "English"}</option></select></div>
        <label className="text-[13px] font-medium text-charcoal/75">{id ? "Nama Tampilan" : "Display Name"}</label>
        <p className="text-[12px] text-charcoal/50 mt-0.5 mb-2">{id ? "Dipakai untuk sapaan di dashboard. Kalau kosong, nama akun digunakan sebagai fallback." : "Used for dashboard greetings. If blank, your account name will be used."}</p>
        <div className="flex gap-2"><input value={name} onChange={(e) => setName(e.target.value)} placeholder={username || (id ? "Nama kamu" : "Your name")} className="flex-1 border border-charcoal/15 rounded-lg px-3 py-2 text-[14px] outline-none focus:border-forest-400 focus:ring-2 focus:ring-forest-50"/><button onClick={handleSaveName} className="flex items-center gap-1.5 bg-forest-600 text-white rounded-lg px-4 py-2 text-[13px] font-medium hover:bg-forest-700">{savedName && <Check size={14}/>} {savedName ? (id ? "Tersimpan" : "Saved") : (id ? "Simpan" : "Save")}</button></div>
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
    <div className="rounded-xl border border-charcoal/8 bg-white overflow-hidden">
      <div className={`${meta.tone} px-3 py-2 text-white`}><div className="flex items-center justify-between"><p className="text-[13px] font-semibold">{title}</p><span className="text-[10px] text-white/75">{items.filter(i => i.active).length} {id ? "aktif" : "active"}</span></div><p className="text-[10px] text-white/75 mt-0.5">{subtitle}</p></div>
      <div className="px-2 py-1.5 bg-charcoal/[0.025] border-b border-charcoal/8 flex items-center justify-between text-[10px] font-semibold text-charcoal/50 uppercase tracking-wide"><span>{id ? "Kategori" : "Category"}</span><span>{id ? "Status" : "Status"}</span></div>
      <div className="p-1.5 max-h-[420px] overflow-y-auto">
        {items.map((item, index) => (
          <div key={`${meta.key}-${index}`} className="group flex items-center gap-1.5 rounded-md px-1.5 py-1 hover:bg-charcoal/[0.035]">
            <GripVertical size={12} className="text-charcoal/20 shrink-0" />
            <input value={item.name} onChange={(e) => onUpdate(index, { name: e.target.value })} placeholder={id ? "Nama kategori" : "Category name"} className="min-w-0 flex-1 bg-transparent text-[12px] text-charcoal outline-none border-b border-transparent focus:border-forest-300 py-0.5" />
            <button type="button" onClick={() => onUpdate(index, { active: !item.active })} aria-label={item.active ? "Nonaktifkan" : "Aktifkan"} className={`relative shrink-0 h-5 w-5 rounded border transition ${item.active ? "border-forest-500 bg-forest-600 text-white" : "border-charcoal/30 bg-white text-transparent"}`}><Check size={13} className="absolute inset-0 m-auto" /></button>
            <button type="button" onClick={() => onRemove(index)} aria-label="Hapus kategori" className="shrink-0 p-1 text-charcoal/20 opacity-0 group-hover:opacity-100 hover:text-rose-600"><Trash2 size={12}/></button>
          </div>
        ))}
        <button type="button" onClick={onAdd} className="mt-1 flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-charcoal/12 py-2 text-[11px] font-semibold text-charcoal/50 hover:border-forest-200 hover:text-forest-700"><Plus size={13}/> Add Category</button>
      </div>
    </div>
  );
}
