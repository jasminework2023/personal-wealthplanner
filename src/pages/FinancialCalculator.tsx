// FinancialCalculator.tsx — Embed "Kalkulator Impian" dari wealthplanner.id
// tanpa keluar dari dashboard. Kalau situs sumbernya suatu saat memblokir
// iframe (X-Frame-Options/CSP), ganti balik ke tombol buka tab baru.

export function FinancialCalculator() {
  return (
    <div className="flex flex-col gap-4 h-full">
      <div>
        <h1 className="text-2xl font-semibold text-forest-900">Kalkulator Finansial</h1>
        <p className="text-[14px] text-charcoal/60 mt-0.5">
          Kalkulator Impian dari Wealthplanner.id.
        </p>
      </div>
      <div className="bg-white rounded-xl2 shadow-card border border-forest-100/60 overflow-hidden" style={{ height: "80vh" }}>
        <iframe
          src="https://www.wealthplanner.id"
          title="Kalkulator Impian Wealthplanner.id"
          className="w-full h-full border-0"
        />
      </div>
    </div>
  );
}
