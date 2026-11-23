import { ArrowLeft, BookOpen, ExternalLink, MessageCircle, ShieldCheck, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/Card";
import { getAppLanguage } from "../lib/format";

const WHATSAPP_COMMUNITY_URL = "https://chat.whatsapp.com/IzgqoDUXGgw0qjsry3KH62";

export function Community() {
  const navigate = useNavigate();
  const id = getAppLanguage() === "id";

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => navigate(-1)} aria-label={id ? "Kembali" : "Go back"} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-charcoal dark:text-white">
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0">
          <h1 className="page-title">Community</h1>
          <p className="page-sub">{id ? "Ruang belajar dan bertumbuh bersama." : "A space to learn and grow together."}</p>
        </div>
      </div>

      <Card className="overflow-hidden !border-[#DDE8E1] !bg-white !p-0 dark:!border-[#2B2D30] dark:!bg-[#141516]">
        <div className="bg-[#292A2D] px-5 py-6 text-white dark:bg-[#1B1C1E]">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
            <Users size={24} />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">WEALTHPLANNER</p>
          <h2 className="mt-1 text-[23px] font-bold leading-tight tracking-[-0.03em]">Grow your wealth, together.</h2>
          <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-white/70">
            {id ? "Tempat untuk belajar, berbagi insight, dan berdiskusi tentang perjalanan finansial yang lebih terencana." : "A place to learn, share insights, and discuss a more intentional financial journey."}
          </p>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-[#F4F5F7] p-3.5 dark:bg-[#1B1C1E]">
            <MessageCircle size={19} className="text-[#0B6B47] dark:text-[#9DB8A8]" />
            <p className="mt-2 text-[13px] font-semibold text-[#17191C] dark:text-[#D5D8DC]">{id ? "Diskusi keuangan" : "Finance discussions"}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-[#6B7280] dark:text-[#8D9298]">{id ? "Tukar pikiran dan pengalaman." : "Exchange ideas and experiences."}</p>
          </div>
          <div className="rounded-2xl bg-[#F4F5F7] p-3.5 dark:bg-[#1B1C1E]">
            <BookOpen size={19} className="text-[#0B6B47] dark:text-[#9DB8A8]" />
            <p className="mt-2 text-[13px] font-semibold text-[#17191C] dark:text-[#D5D8DC]">{id ? "Edukasi finansial" : "Financial education"}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-[#6B7280] dark:text-[#8D9298]">{id ? "Belajar mengelola uang dan aset." : "Learn to manage money and assets."}</p>
          </div>
          <div className="rounded-2xl bg-[#F4F5F7] p-3.5 dark:bg-[#1B1C1E]">
            <ShieldCheck size={19} className="text-[#0B6B47] dark:text-[#9DB8A8]" />
            <p className="mt-2 text-[13px] font-semibold text-[#17191C] dark:text-[#D5D8DC]">{id ? "Ruang yang suportif" : "A supportive space"}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-[#6B7280] dark:text-[#8D9298]">{id ? "Berbagi dengan saling menghargai." : "Share with mutual respect."}</p>
          </div>
        </div>

        <div className="px-4 pb-4">
          <a href={WHATSAPP_COMMUNITY_URL} target="_blank" rel="noopener noreferrer" className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0B6B47] px-4 py-3 text-[13px] font-semibold text-white transition hover:bg-[#08583A]">
            <MessageCircle size={17} />
            {id ? "Gabung Community WhatsApp" : "Join WhatsApp Community"}
            <ExternalLink size={15} />
          </a>
          <p className="mt-2 text-center text-[10.5px] leading-relaxed text-[#6B7280] dark:text-[#8D9298]">
            {id ? "Kamu akan diarahkan ke WhatsApp untuk bergabung." : "You will be redirected to WhatsApp to join."}
          </p>
        </div>
      </Card>
    </div>
  );
}
