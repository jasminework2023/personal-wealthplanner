const LANGUAGE_KEY = "wealthplanner_language";
export type AppLanguage = "id" | "en";

export function getAppLanguage(): AppLanguage {
  try {
    return localStorage.getItem(LANGUAGE_KEY) === "en" ? "en" : "id";
  } catch {
    return "id";
  }
}

export function setAppLanguage(language: AppLanguage): void {
  try {
    localStorage.setItem(LANGUAGE_KEY, language);
  } catch {
    // Keep the current session usable when storage is unavailable.
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("wealthplanner:language-changed", { detail: language }));
  }
}

export function formatRupiah(n: number): string {
  const rounded = Math.round(n);
  return "Rp" + rounded.toLocaleString(getAppLanguage() === "id" ? "id-ID" : "en-US");
}

export function formatCompact(n: number): string {
  const language = getAppLanguage();
  if (Math.abs(n) >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2).replace(/\.00$/, "") + (language === "id" ? "M" : "B");
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + (language === "id" ? "jt" : "M");
  return formatRupiah(n);
}

export function formatPercent(n: number): string {
  return n.toLocaleString(getAppLanguage() === "id" ? "id-ID" : "en-US", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  }) + "%";
}
