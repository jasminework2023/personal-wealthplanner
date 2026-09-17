import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

const STORAGE_KEY = "wealthplanner-theme";

function applyTheme(theme: "light" | "dark") {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
}

function readInitialTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved === "dark" || saved === "light") return saved;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/**
 * variant "bar"     -> tombol lebar dengan label (dipakai di sidebar/topbar)
 * variant "compact" -> tombol ikon bulat (dipakai di header kanan atas desktop)
 */
export function ThemeToggle({ variant = "bar" }: { variant?: "bar" | "compact" }) {
  const [theme, setTheme] = useState<"light" | "dark">(readInitialTheme);

  useEffect(() => {
    applyTheme(theme);
    window.localStorage.setItem(STORAGE_KEY, theme);
    window.dispatchEvent(new CustomEvent("wealthplanner:theme-changed", { detail: theme }));
  }, [theme]);

  // Sinkronkan toggle desktop/mobile dalam tab yang sama dan antar-tab.
  useEffect(() => {
    function onThemeChange(e: Event) {
      const value = (e as CustomEvent).detail;
      if (value === "dark" || value === "light") setTheme(value);
    }
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY && (e.newValue === "dark" || e.newValue === "light")) {
        setTheme(e.newValue);
      }
    }
    window.addEventListener("wealthplanner:theme-changed", onThemeChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("wealthplanner:theme-changed", onThemeChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const isDark = theme === "dark";
  const label = isDark ? "Mode terang" : "Mode gelap";
  const toggle = () => setTheme((c) => (c === "dark" ? "light" : "dark"));

  if (variant === "compact") {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-label={label}
        title={label}
        className="flex items-center gap-2 rounded-full border border-charcoal/12 bg-white px-3 py-1.5 text-[12.5px] font-medium text-charcoal/60 transition-colors hover:border-forest-200 hover:text-forest-700"
      >
        {isDark ? <Sun size={14} /> : <Moon size={14} />}
        <span className="hidden sm:inline">{isDark ? "Terang" : "Gelap"}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-[14px] text-white hover:bg-white/10 transition-all"
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
      <span>{isDark ? "Light Mode" : "Dark Mode"}</span>
    </button>
  );
}
